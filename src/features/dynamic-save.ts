import { SaveModelAction } from '@dynamic-glsp/protocol';
import {
  Action,
  FeatureModule,
  GModelRoot,
  IDiagramOptions,
  KeyListener,
  TYPES,
  bindAsService,
  matchesKeystroke
} from '@eclipse-glsp/client';

import { DynamicSvgExporter } from './dynamic-export';
import { inject, injectable } from 'inversify';

export const dynamicSaveModule = new FeatureModule(
  (bind) => {
    bindAsService(bind, TYPES.KeyListener, SaveModelKeyboardListener);
  },
  { featureId: Symbol('save') }
);

@injectable()
export class SaveModelKeyboardListener extends KeyListener {
  @inject(TYPES.SvgExporter)
  protected svgExporter?: DynamicSvgExporter;

  @inject(TYPES.IDiagramOptions)
  protected diagramOptions!: IDiagramOptions;

  override keyDown(element: GModelRoot, event: KeyboardEvent): Action[] {
    // if diagram options editMode is readonly, not allow to save model
    if (this.diagramOptions.editMode === 'readonly') return [];

    if (matchesKeystroke(event, 'KeyS', 'ctrlCmd')) {
      return [SaveModelAction.create({ preview: this.svgExporter?.getSvg() })];
    }
    return [];
  }
}
