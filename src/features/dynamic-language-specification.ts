import {
  Language,
  LanguageElement,
  LoadLanguageSpecificationAction,
  ReadyLanguageSpecificationAction
} from '@dynamic-glsp/protocol';
import {
  DefaultTypes,
  FeatureModule,
  GEdge,
  GNode,
  IActionDispatcher,
  RequestTypeHintsAction,
  TYPES
} from '@eclipse-glsp/client';

import { IDynamicDiagramOptions } from '../dynamic-diagram-loader';
import { DynamicEdgeView, DynamicNodeView } from '../views/dynamic-views';
import { DynamicRegistry } from './dynamic-registry';
import { inject, injectable } from 'inversify';

export const dynamicLanguageSpecificationModule = new FeatureModule(
  (bind, _unbind) => {
    bind(DynamicLanguageSpecification).toSelf().inSingletonScope();
  },
  { featureId: Symbol('languageSpecification') }
);

@injectable()
export class DynamicLanguageSpecification {
  @inject(TYPES.IDiagramOptions)
  protected diagramOptions!: IDynamicDiagramOptions;

  @inject(TYPES.IActionDispatcher)
  protected actionDispatcher!: IActionDispatcher;

  @inject(DynamicRegistry)
  protected registry!: DynamicRegistry;

  @inject(DynamicNodeView)
  protected nodeView!: DynamicNodeView;

  @inject(DynamicEdgeView)
  protected edgeView!: DynamicEdgeView;

  async sendLoadLanguageSpecificationAction(language?: string | Language | LanguageElement): Promise<void> {
    const loadLanguageSpecificationAction = LoadLanguageSpecificationAction.create(
      language || this.diagramOptions.language,
      {
        showcaseMode: this.diagramOptions.showcaseMode
      }
    );

    // wait for the language specification to be returned from the server
    const readyLanguageSpecificationAction = await this.actionDispatcher?.request<ReadyLanguageSpecificationAction>(
      loadLanguageSpecificationAction
    );

    // register the nodes and edges in the view/model registry
    const languageSpecification = readyLanguageSpecificationAction?.language;

    Object.entries(languageSpecification?.nodes).forEach(([nodeType, nodeSpec]) => {
      this.registry.register(`${DefaultTypes.NODE}:${nodeType}`, GNode, this.nodeView);
    });

    Object.entries(languageSpecification?.edges).forEach(([edgeType, edgeSpec]) => {
      this.registry.register(`${DefaultTypes.EDGE}:${edgeType}`, GEdge, this.edgeView);
    });

    // ask for the type hints again
    await this.actionDispatcher.request(RequestTypeHintsAction.create());
  }
}
