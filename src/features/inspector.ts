import { ChangeModelOperation } from '@dynamic-glsp/protocol';
import {
  AbstractUIExtension,
  EditorContextService,
  GEdge,
  GModelRoot,
  GNode,
  IActionDispatcher,
  IDiagramOptions,
  IDiagramStartup,
  ISelectionListener,
  MaybePromise,
  TYPES
} from '@eclipse-glsp/client';

import { ExternalServices } from '../diagram/dynamic-external-services';
import { inject, injectable } from 'inversify';

export const IInspector = Symbol('IInspector');

@injectable()
export class Inspector extends AbstractUIExtension implements ISelectionListener, IDiagramStartup {
  @inject(TYPES.IActionDispatcher)
  protected readonly actionDispatcher!: IActionDispatcher;

  @inject(EditorContextService)
  protected editorContext!: EditorContextService;

  @inject(ExternalServices)
  protected services!: ExternalServices;

  @inject(TYPES.IDiagramOptions)
  protected diagramOptions!: IDiagramOptions;

  static readonly ID = 'inspector';

  id() {
    return Inspector.ID;
  }

  containerClass() {
    return Inspector.ID;
  }

  exampleData = {
    name: 'John Doe'
  };

  exampleSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string'
      }
    }
  };

  exampleUiSchema = {
    type: 'VerticalLayout',
    elements: [
      {
        type: 'Control',
        scope: '#/properties/name'
      }
    ]
  };

  protected initializeContents(containerElement: HTMLElement): void {
    this.services.inspectorElementChanged = async (elementId: string, newModel: any) => {
      console.log('Model Changed', elementId, newModel);
      const modelChangeOperation = ChangeModelOperation.create({ elementId, newModel });
      await this.actionDispatcher.dispatch(modelChangeOperation);
    };
    this.setNoSelection();
  }

  postModelInitialization(): MaybePromise<void> {
    this.show(this.editorContext.modelRoot);
  }

  selectionChanged(root: Readonly<GModelRoot>, selectedElements: string[], deselectedElements?: string[]): void {
    // if diagram options editMode is readonly, do not show the inspector
    if (this.diagramOptions.editMode === 'readonly') return;

    if (selectedElements.length === 1) {
      const selectedElement = this.getGModelElement(root, selectedElements[0]);
      if (selectedElement) this.setElement(selectedElement);
    } else {
      this.setNoSelection();
    }
  }

  /**
   * Sets the inspector content when no element is selected.
   */
  protected setNoSelection() {
    // const noSelection = document.createElement('div');
    // noSelection.classList.add('no-selection');
    // noSelection.textContent = 'Select an element to inspect';

    this.containerElement.classList.add('collapsed');

    // wait for the container to be collapsed before removing the content
    setTimeout(() => {
      this.containerElement.innerHTML = '';
    }, 200);

    // this.containerElement.appendChild(noSelection);
  }

  /**
   * Sets the inspector content for the given element.
   */
  protected setElement(selectedElement: any) {
    console.log('SELECTED ELEMENT', selectedElement);

    this.containerElement.innerHTML = '';

    const title = document.createElement('h4');
    title.textContent = selectedElement.args?.elementLabel;
    this.containerElement.appendChild(title);

    const formContainer = document.createElement('div');
    formContainer.classList.add('form-container');
    this.containerElement.appendChild(formContainer);

    // if the selected element has no aModel or model, do not create the element
    // probably must show a error message
    if (!selectedElement.args?.aModel || !selectedElement.args?.model) {
      console.error('AModel or Model not found in element to inspect.');
      this.setNoSelection();
      return;
    }

    // check if the inspectorCreateElement method is defined and call it
    if (this.services.inspectorCreateElement) {
      this.services.inspectorCreateElement(
        formContainer,
        selectedElement.id,
        selectedElement.args?.aModel,
        selectedElement.args?.model
      );
    } else {
      console.error('inspectorCreateElement method not provided to GLSP ExternalServices.');
      this.setNoSelection();
      return;
    }

    this.containerElement.classList.remove('collapsed');
  }

  /**
   * Get the GModel element for the given id and root.
   */
  protected getGModelElement(root: Readonly<GModelRoot>, id: string): GNode | GEdge | undefined {
    const element = root.children.find((child) => child.id === id);
    switch (element?.type) {
      case 'node':
        return element as GNode;
      case 'edge':
        return element as GEdge;
      default:
        return undefined;
    }
  }
}
