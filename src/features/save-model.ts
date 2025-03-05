import { SaveModelAction } from '@dynamic-glsp/protocol';
import { Action, GModelRoot, IDiagramOptions, KeyListener, TYPES, matchesKeystroke } from '@eclipse-glsp/client';

import { SvgExporter } from './svg-exporter';
import { inject, injectable } from 'inversify';

@injectable()
export class SaveModelKeyboardListener extends KeyListener {
  @inject(TYPES.SvgExporter)
  protected svgExporter?: SvgExporter;

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
