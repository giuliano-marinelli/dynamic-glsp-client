import { LoadLanguageSpecificationAction, ReadyLanguageSpecificationAction } from '@dynamic-glsp/protocol';
import { CenterAction, GridManager, IActionDispatcher, IDiagramStartup, TYPES } from '@eclipse-glsp/client';

import { SvgExporter } from '../features/svg-exporter';
import { ExternalServices } from './dynamic-external-services';
import { inject, injectable, optional } from 'inversify';

@injectable()
export class StartupConfiguration implements IDiagramStartup {
  rank = -1;

  @inject(TYPES.IActionDispatcher)
  protected readonly actionDispatcher!: IActionDispatcher;

  @inject(TYPES.SvgExporter)
  protected svgExporter?: SvgExporter;

  @inject(GridManager)
  @optional()
  protected gridManager?: GridManager;

  @inject(ExternalServices)
  protected services!: ExternalServices;

  async preRequestModel(): Promise<void> {
    // action for setting the grid visible
    this.gridManager?.setGridVisible(true);

    // set action dispatcher for use with external services
    this.services.actionDispatcher = this.actionDispatcher;

    // define reload language function for use with external services
    this.services.reloadLanguage = async () => {
      await this.sendLoadLanguageSpecificationAction();
    };

    // define get svg function for use with external services
    this.services.getSVG = () => {
      return this.svgExporter?.getSvg() ?? '';
    };

    // load the language specification for the first time
    await this.sendLoadLanguageSpecificationAction();
  }

  async postModelInitialization(): Promise<void> {
    // if showcase mode is true, center the diagram
    if (this.services.showcaseMode) {
      await this.actionDispatcher?.dispatch(CenterAction.create(['showcase_element', 'source', 'target']));
    }
  }

  private async sendLoadLanguageSpecificationAction() {
    const loadLanguageSpecificationAction = LoadLanguageSpecificationAction.create(this.services.language!, {
      showcaseMode: this.services.showcaseMode
    });
    await this.actionDispatcher?.request<ReadyLanguageSpecificationAction>(loadLanguageSpecificationAction);
  }
}
