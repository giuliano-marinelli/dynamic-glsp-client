# Dynamic GLSP - Client [![npm version](https://badge.fury.io/js/@dynamic-glsp%2Fclient.svg)](https://badge.fury.io/js/@dynamic-glsp%2Fclient)

_On this package we had the **client** code._

## Installation

```bash
$ npm install @eclipse-glsp/protocol @eclipse-glsp/client inversify @dynamic-glsp/protocol @dynamic-glsp/client
```

## Usage

This package provides the custom client module for dynamic diagram language support. You have to use it in an frontend project to create a new GLSP client. It can be used with Angular, React, Vue, or any other frontend framework.

Next is an example of how to use it with Angular and JsonForms for render inspector:

```typescript
import { AfterViewInit, Component, Input, NgZone, ViewContainerRef } from '@angular/core';
import {
  DynamicGLSPWebSocketProvider,
  ExternalServices,
  initializeDynamicDiagramContainer
} from '@dynamic-glsp/client';
import { AModelElementSchema, AModelRootSchema, Language, LanguageElement } from '@dynamic-glsp/protocol';
import {
  Action,
  BaseJsonrpcGLSPClient,
  ConnectionProvider,
  DiagramLoader,
  FeatureModule,
  GLSPActionDispatcher,
  GLSPClient,
  MessageAction,
  StatusAction,
  accessibilityModule,
  createDiagramOptionsModule
} from '@eclipse-glsp/client';
import { JsonForms } from '@jsonforms/angular';

import { AuthService } from '../../../services/auth.service';
import { Container } from 'inversify';

@Component({
  selector: 'model-editor',
  template: '<div id="sprotty"></div>'
})
export class ModelEditorComponent implements AfterViewInit {
  @Input() sourceUri: string = ''; // uri for load model data
  @Input() language: string | Language | LanguageElement = ''; // uri for load language definition or explicit definition
  @Input() editMode: 'readonly' | 'editable' = 'editable'; // define if the model is editable or readonly
  @Input() showcaseMode: boolean = false; // showcase mode for inspect a specific language element

  port: number = 3001; // web socket port (must be the same as the GLSP server)

  id: string = 'dynamic'; // id for the JSON RPC Client (must be the same as the GLSP server)

  diagramType: string = 'dynamic'; // diagramType for the GLSP server (it's always dynamic)

  clientId: string = 'sprotty'; // id of the sprotty div container
  webSocketUrl: string = `ws://127.0.0.1:${this.port}/${this.id}`; // web socket url for the GLSP server

  glspClient!: GLSPClient;
  container!: Container;
  wsProvider?: DynamicGLSPWebSocketProvider;

  services: ExternalServices = {};

  constructor(
    public auth: AuthService,
    private ngZone: NgZone,
    private viewContainerRef: ViewContainerRef
  ) {}

  // run outside Angular zone to avoid change detection on the GLSP client
  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      let self = this;

      // define services for language specification
      this.services.language = this.language;
      this.services.showcaseMode = this.showcaseMode;

      // define services for the inspector
      this.services.inspectorCreateElement = (
        container: HTMLElement,
        elementId: string,
        elementAModel: AModelRootSchema,
        elementModel: any
      ) => {
        self.createJsonForms(container, elementId, elementAModel, elementModel);
      };

      // create a new custom WebSocket provider for the GLSP client, which sends authentication headers as protocol messages
      this.wsProvider = new DynamicGLSPWebSocketProvider(this.webSocketUrl, this.auth.getToken() || undefined);

      // create a new feature module for the external services (it can provide access to services outside GLSP)
      const externalServicesModule = new FeatureModule(
        (bind, unbind, isBound, rebind) => {
          const context = { bind, unbind, isBound, rebind };
          bind(ExternalServices).toConstantValue(this.services);
        },
        { featureId: Symbol('externalServices') }
      );

      async function glspOnConnection(connectionProvider: ConnectionProvider, isReconnecting = false): Promise<void> {
        // create GLSP client for the JSON RPC communication with server
        self.glspClient = new BaseJsonrpcGLSPClient({ id: self.id, connectionProvider });

        // create the diagram container which use the clientId to find the DOM element to render the diagram
        // and the diagramType to find the correct diagram configuration in the GLSP server
        // and the glspClient to communicate via JSON RPC with the GLSP server
        self.container = initializeDynamicDiagramContainer(
          createDiagramOptionsModule(
            {
              clientId: self.clientId,
              diagramType: self.diagramType,
              sourceUri: self.sourceUri,
              editMode: self.editMode,
              glspClientProvider: async () => self.glspClient
            },
            { baseDiv: 'sprotty' }
          ),
          self.editMode === 'editable' ? accessibilityModule : {}, // add accessibility module if the diagram is editable
          externalServicesModule
        );

        const actionDispatcher = self.container.get(GLSPActionDispatcher);
        const diagramLoader = self.container.get(DiagramLoader);

        await diagramLoader.load({
          requestModelOptions: {
            isReconnecting
          }
        });

        if (isReconnecting) {
          const message = `Connection to the ${self.id} GLSP server got closed. Connection was successfully re-established.`;
          const timeout = 5000;
          const severity = 'WARNING';

          actionDispatcher.dispatchAll([
            StatusAction.create(message, { severity, timeout }),
            MessageAction.create(message, { severity })
          ]);

          return;
        }
      }

      async function glspOnReconnect(connectionProvider: ConnectionProvider): Promise<void> {
        self.glspClient.stop();
        glspOnConnection(connectionProvider, true);
      }

      this.wsProvider.listen({ onConnection: glspOnConnection, onReconnect: glspOnReconnect, logger: console });
    });
  }

  async sendAction(action: Action): Promise<void> {
    await this.services.actionDispatcher?.dispatch(action);
  }

  async reloadLanguage(language?: string | Language | LanguageElement): Promise<void> {
    if (language) {
      this.language = language;
      this.services.language = language;
    }
    await this.services.reloadLanguage?.();
  }

  getSVG(): string {
    return this.services.getSVG?.() || '';
  }

  createJsonForms(container: HTMLElement, elementId: string, elementAModel: AModelRootSchema, elementModel: any): void {
    const componentRef = this.viewContainerRef.createComponent(JsonForms);
    componentRef.instance.data = elementModel;

    const {
      schema,
      uiSchema
    } = // TODO: generate schema and ui schema from the AModel
      (componentRef.instance.schema = schema);
    componentRef.instance.uischema = uiSchema;

    container.appendChild(componentRef.location.nativeElement);

    // to avoid firing the change event before the component is initialized
    setTimeout(() => {
      componentRef.instance.dataChange.subscribe((event: any) => {
        // send the new model to the GLSP external services so it can be used by the inspector
        this.services.inspectorElementChanged?.(elementId, event);
      });
    }, 0);
  }
}
```

## Overview

Dynamic GLSP is an instance of [Graphical Language Server Platform (GLSP)](https://github.com/eclipse-glsp/glsp). It allows defining the model language through a meta-meta-model (or M2 model). This approach enables the dynamic generation of model elements data and graphics based on the language definition.

To achieve this, an extended generative GModel was created for graphical notation. Additionally, a new schema called AModel, based on JSON Schema, was developed for the model elements data. This schema is used to validate the model elements data and to generate the model elements data editor.

### Dynamic GLSP Server

The server is responsible for dynamically generating GModel and AModel based on the M2 model. It takes the meta elements definitions: generative GModel, AModel, and default data, and generates the model elements data and graphics to be used by the GLSP client. The server also provides:

- **Actions and Operations**: Define interactions for loading/saving the model language and allow dynamic changes in the model elements data.
- **Authentication**: Actions and operations can send authentication data to the server: token, user-agent, and IP address are provided to validate user access.
- **External Services**: Configurable services for language and model persistence and retrieval from external sources. Authentication data is sent to these services too.
- **Tool Palette**: Automatically generates the tool palette based on the M2 model.
- **Validation**: Validates the model elements data based on the AModel schema.

### Dynamic GLSP Client

The client is responsible for rendering the model elements graphics and data editor. The client also provides:

- **Inspector**: Defines the mechanism for inspecting the model elements AModel and sending data change operations to the server. It relies on an external form generation method.
- **External Services**: Offer interfaces for accessing language management and actions and operations execution. Additionally, it provides methods for exporting model SVG.
- **Styles and Views**: Defines a set of styles and views for properly rendering the model based on M2 model diversity, correctly displaying the inspector, and more.

### Dynamic GLSP Protocol

The protocol is responsible for defining the communication between the server and the client. It defines the interfaces for model language, generative GModel, and AModel. Moreover, it defines the actions and operations interfaces for language management and data change.

## Stay in touch

- Author - [Giuliano Marinelli](https://www.linkedin.com/in/giuliano-marinelli/)
- Website - [https://github.com/giuliano-marinelli](https://github.com/giuliano-marinelli)

## License

This package is [MIT licensed](LICENSE).
