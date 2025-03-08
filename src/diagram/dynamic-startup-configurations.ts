import {
  CenterAction,
  DefaultTypes,
  GGraph,
  GLSPProjectionView,
  GridManager,
  IActionDispatcher,
  IDiagramStartup,
  TYPES
} from '@eclipse-glsp/client';

import { IDynamicDiagramOptions } from '../dynamic-diagram-loader';
import { DynamicRegistry } from '../features/dynamic-registry';
import { inject, injectable, optional } from 'inversify';

@injectable()
export class StartupConfiguration implements IDiagramStartup {
  rank = -1;

  @inject(TYPES.IDiagramOptions)
  protected diagramOptions!: IDynamicDiagramOptions;

  @inject(TYPES.IActionDispatcher)
  protected actionDispatcher!: IActionDispatcher;

  @inject(TYPES.IGridManager)
  @optional()
  protected gridManager?: GridManager;

  @inject(DynamicRegistry)
  protected registry!: DynamicRegistry;

  @inject(GLSPProjectionView)
  protected projectionView!: GLSPProjectionView;

  async preInitialize(): Promise<void> {
    // register the projection view if the edit mode is editable
    if (this.diagramOptions.editMode === 'editable') {
      this.registry.register(DefaultTypes.GRAPH, GGraph, this.projectionView);
    }
  }

  async preRequestModel(): Promise<void> {
    // action for setting the grid visible
    this.gridManager?.setGridVisible(true);
  }

  async postModelInitialization(): Promise<void> {
    // if showcase mode is true, center the diagram
    if (this.diagramOptions.showcaseMode) {
      await this.actionDispatcher?.dispatch(CenterAction.create(['showcase_element', 'source', 'target']));
    }
  }
}
