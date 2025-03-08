import {
  EnableDefaultToolsAction,
  FeatureModule,
  SetModelAction,
  TYPES,
  ToolPalette,
  UpdateModelAction,
  bindAsService,
  configureActionHandler
} from '@eclipse-glsp/client';

import { injectable } from 'inversify';

export const dynamicToolPaletteModule = new FeatureModule(
  (bind, _unbind, isBound, _rebind) => {
    bindAsService(bind, TYPES.IUIExtension, DynamicToolPalette);
    bind(TYPES.IDiagramStartup).toService(DynamicToolPalette);
    configureActionHandler({ bind, isBound }, EnableDefaultToolsAction.KIND, DynamicToolPalette);
    configureActionHandler({ bind, isBound }, UpdateModelAction.KIND, DynamicToolPalette);
    configureActionHandler({ bind, isBound }, SetModelAction.KIND, DynamicToolPalette);
  },
  { featureId: Symbol('toolPalette') }
);

@injectable()
export class DynamicToolPalette extends ToolPalette {}
