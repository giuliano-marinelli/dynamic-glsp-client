import { DynamicTypes } from '@dynamic-glsp/protocol';
import {
  ConsoleLogger,
  ContainerConfiguration,
  DEFAULT_ALIGNABLE_ELEMENT_FILTER,
  FeatureModule,
  GCompartment,
  GLSPProjectionView,
  IDiagramOptions,
  IHelperLineOptions,
  LogLevel,
  STANDALONE_MODULE_CONFIG,
  TYPES,
  ViewerOptions,
  accessibilityModule,
  bindOrRebind,
  boundsModule,
  configureDefaultModelElements,
  configureModelElement,
  createDiagramOptionsModule,
  edgeCreationToolModule,
  exportModule,
  gridModule,
  helperLineModule,
  initializeDiagramContainer,
  saveModule,
  toolPaletteModule
} from '@eclipse-glsp/client';

import { DynamicDiagramLoader } from '../dynamic-diagram-loader';
import { GShape } from '../dynamic-model';
import { dynamicBoundsModule } from '../features/dynamic-bounds';
import { dynamicEdgeCreationToolModule } from '../features/dynamic-edge-creation-tool';
import { dynamicExportModule } from '../features/dynamic-export';
import { dynamicInspectorModule } from '../features/dynamic-inspector';
import { dynamicLanguageSpecificationModule } from '../features/dynamic-language-specification';
import { dynamicRegistryModule } from '../features/dynamic-registry';
import { dynamicSaveModule } from '../features/dynamic-save';
import { DynamicEdgeView, DynamicNodeView, DynamicShapeView } from '../views/dynamic-views';
import { StartupConfiguration } from './dynamic-startup-configurations';
import { Container } from 'inversify';

export const dynamicDefaultModule = new FeatureModule((bind, unbind, isBound, rebind) => {
  const context = { bind, unbind, isBound, rebind };

  // configure the dynamic diagram loader to allow language specification loading
  bindOrRebind(context, DynamicDiagramLoader).toSelf().inSingletonScope();

  // configure the default logger to show only warnings
  bindOrRebind(context, TYPES.LogLevel).toConstantValue(LogLevel.warn);
  bindOrRebind(context, TYPES.ILogger).to(ConsoleLogger).inSingletonScope();

  // configure utilities, actions and services that needs to be loaded previously to the model
  bind(StartupConfiguration).toSelf().inSingletonScope();
  bind(TYPES.IDiagramStartup).toService(StartupConfiguration);

  // configure the marquee tool behavior to select only the entire edge or element
  bind(TYPES.IMarqueeBehavior).toConstantValue({ entireEdge: true, entireElement: true });

  // configure the helper line options dynamically
  bind(TYPES.IHelperLineOptions).toDynamicValue(() => {
    const options: IHelperLineOptions = {};
    // skip compartments for alignment which are only used for structure
    options.alignmentElementFilter = (element) =>
      DEFAULT_ALIGNABLE_ELEMENT_FILTER(element) && !(element instanceof GCompartment) && !(element instanceof GShape);
    return options;
  });

  // bind dynamic views for use in dynamic registry
  bind(DynamicNodeView).toSelf();
  bind(DynamicEdgeView).toSelf();
  bind(GLSPProjectionView).toSelf(); // projection view is added for dynamically active it in editable mode

  // configure default model elements
  configureDefaultModelElements(context);

  // configure model shape element
  configureModelElement(context, DynamicTypes.SHAPE, GShape, DynamicShapeView);
});

export function initializeDynamicDiagramContainer(
  diagramOptions: IDiagramOptions,
  viewerOptions: Partial<ViewerOptions>,
  ...extraModules: ContainerConfiguration
): Container {
  const editModeModules = [
    gridModule, // configure grid on the diagram and button to toggle the grid
    accessibilityModule, // configure accessibility features
    helperLineModule // configure helper lines for alignment
  ];

  // create a new container and load all the modules that are needed
  // the modules are a set of bindings and configurations already defined in the GLSP client that can be reused or extended
  const container = initializeDiagramContainer(
    new Container(),
    createDiagramOptionsModule(diagramOptions, viewerOptions),
    STANDALONE_MODULE_CONFIG, // contains a set of default modules for basic features like undo/redo, copy/paste, selection, etc.
    { remove: [toolPaletteModule, boundsModule, exportModule, saveModule, edgeCreationToolModule] }, // remove modules that must be replaced by custom ones
    { add: diagramOptions.editMode === 'editable' ? editModeModules : [] }, // add modules that are only needed in editable mode
    dynamicDefaultModule, // configure the default module with basic preferences and configurations
    dynamicRegistryModule, // configure the dynamic registry that allow to register views and models dynamically
    dynamicBoundsModule, // configure custom layouters (for allow absolute and relative layout combined)
    dynamicExportModule, // configure custom svg exporter (for allow correctly shown svg previews)
    dynamicSaveModule, // configure the save model action with (Ctrl + S) shortcut
    dynamicEdgeCreationToolModule, // configure custom edge creation tool (for always send create operation with edge base type)
    // dynamicToolPaletteModule, // configure custom tool palette
    dynamicInspectorModule, // configure the inspector that allow to edit elements aModel properties
    dynamicLanguageSpecificationModule, // configure the language manager that allow send load language specifications actions
    ...extraModules
  );

  return container;
}
