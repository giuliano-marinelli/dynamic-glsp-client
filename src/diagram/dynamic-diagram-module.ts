import {
  ConsoleLogger,
  ContainerConfiguration,
  DEFAULT_ALIGNABLE_ELEMENT_FILTER,
  DefaultTypes,
  GCompartment,
  GEdge,
  GGraph,
  GLSPProjectionView,
  GLabel,
  GLabelView,
  IHelperLineOptions,
  LogLevel,
  PolylineEdgeViewWithGapsOnIntersections,
  STANDALONE_MODULE_CONFIG,
  TYPES,
  accessibilityModule,
  bindOrRebind,
  configureDefaultModelElements,
  debugModule,
  edgeEditToolModule,
  exportModule,
  gridModule,
  helperLineModule,
  initializeDiagramContainer,
  keyboardToolPaletteModule,
  overrideModelElement,
  saveModule,
  toolPaletteModule
} from '@eclipse-glsp/client';

import { Inspector } from '../features/inspector';
import { SvgExporter } from '../features/svg-exporter';
import { Container, ContainerModule } from 'inversify';

import { StartupConfiguration } from './dynamic-startup-configurations';

import { SaveModelKeyboardListener } from '../features/save-model';

export const dynamicDiagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
  const context = { bind, unbind, isBound, rebind };

  // configure utilities, actions and services that needs to be loaded previously to the model
  bind(StartupConfiguration).toSelf().inSingletonScope();
  bind(TYPES.IDiagramStartup).toService(StartupConfiguration);

  // configure the custom svg exporter to allow get svg from the GModel
  bind(TYPES.SvgExporter).to(SvgExporter).inSingletonScope();

  // configure the save model action with (Ctrl + S) shortcut
  bind(SaveModelKeyboardListener).toSelf().inSingletonScope();
  bind(TYPES.KeyListener).toService(SaveModelKeyboardListener);

  // configure the inspector that allow to edit elements abstract properties
  bind(Inspector).toSelf().inSingletonScope();
  bind(TYPES.IUIExtension).toService(Inspector);
  bind(TYPES.IDiagramStartup).toService(Inspector);
  bind(TYPES.ISelectionListener).toService(Inspector);

  // configure the default logger to show only warnings and errors
  bindOrRebind(context, TYPES.LogLevel).toConstantValue(LogLevel.warn);
  bindOrRebind(context, TYPES.ILogger).to(ConsoleLogger).inSingletonScope();

  // configure the marquee tool behavior to select only the entire edge or element
  bindOrRebind(context, TYPES.IMarqueeBehavior).toConstantValue({ entireEdge: true, entireElement: true });

  // configure the helper line options dynamically
  bind<IHelperLineOptions>(TYPES.IHelperLineOptions).toDynamicValue(() => {
    const options: IHelperLineOptions = {};
    // skip compartments for alignment which are only used for structure
    options.alignmentElementFilter = (element) =>
      DEFAULT_ALIGNABLE_ELEMENT_FILTER(element) && !(element instanceof GCompartment);
    return options;
  });

  configureDefaultModelElements(context);

  // configure the GGraph (graphical model root element) for render the projection view (scrollbars for spanning the diagram)
  overrideModelElement(context, DefaultTypes.GRAPH, GGraph, GLSPProjectionView);

  // configure the GLabel (graphical model label element) with the GLabelView (default view for rendering labels)
  // and enable the edit label feature (double click on label to edit)
  overrideModelElement(context, DefaultTypes.LABEL, GLabel, GLabelView /*, { enable: [editLabelFeature] }*/); // disable edit label feature for now

  // configure the GEdge (graphical model edge element) with the PolylineEdgeViewWithGapsOnIntersections view to render edges with gaps on intersections
  overrideModelElement(context, DefaultTypes.EDGE, GEdge, PolylineEdgeViewWithGapsOnIntersections);
});

export function initializeDynamicDiagramContainer(...containerConfiguration: ContainerConfiguration): Container {
  // create a new container and load all the modules that are needed
  // the modules are a set of bindings and configurations already defined in the GLSP client that can be reused or extended
  // the dynamicDiagramModule contains base custom bindings for our dynamic diagram language
  return initializeDiagramContainer(
    new Container(),
    ...containerConfiguration,
    STANDALONE_MODULE_CONFIG, // contains a set of default modules for basic features like undo/redo, copy/paste, selection, etc.
    dynamicDiagramModule, // load all the bindings for the dynamic diagram language
    helperLineModule, // load bindings for helper lines for alignment
    gridModule, // load bindings for grid on the diagram and button to toggle the grid
    edgeEditToolModule, // load bindings for debug mode (it can be enable with an option at command palette)
    debugModule,
    {
      // add: accessibilityModule, // throws error when using editMode: READONLY (it need to be added on containerConfiguration)
      remove: [toolPaletteModule, saveModule, exportModule]
    }
  );
}
