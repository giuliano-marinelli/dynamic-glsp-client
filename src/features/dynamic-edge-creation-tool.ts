import {
  Action,
  CreateEdgeOperation,
  DefaultTypes,
  EdgeCreationTool,
  EdgeCreationToolMouseListener,
  FeatureModule,
  GModelElement,
  TYPES,
  TriggerEdgeCreationAction,
  bindAsService,
  configureActionHandler,
  configureDanglingFeedbackEdge
} from '@eclipse-glsp/client';

import { injectable } from 'inversify';

export const dynamicEdgeCreationToolModule = new FeatureModule(
  (bind, unbind, isBound, rebind) => {
    const context = { bind, unbind, isBound, rebind };
    bindAsService(context, TYPES.ITool, DynamicEdgeCreationTool);
    configureActionHandler(context, TriggerEdgeCreationAction.KIND, DynamicEdgeCreationTool);
    configureDanglingFeedbackEdge(context);
  },
  { featureId: Symbol('edgeCreationTool') }
);

@injectable()
export class DynamicEdgeCreationTool extends EdgeCreationTool {
  protected override creationListener(): void {
    const creationListener = new DynamicEdgeCreationToolMouseListener(
      this.triggerAction,
      this.actionDispatcher,
      this.typeHintProvider,
      this,
      this.grid ? this.grid.x / 2 : undefined
    );
    this.toDisposeOnDisable.push(creationListener, this.mouseTool.registerListener(creationListener));
  }
}

export class DynamicEdgeCreationToolMouseListener extends EdgeCreationToolMouseListener {
  protected override getCreateOperation(
    element: GModelElement,
    event: MouseEvent,
    sourceElementId: string,
    targetElementId: string
  ): Action {
    return CreateEdgeOperation.create({
      elementTypeId: DefaultTypes.EDGE,
      sourceElementId,
      targetElementId,
      args: this.getCreateEdgeOperationArgs(element, event)
    });
  }
}
