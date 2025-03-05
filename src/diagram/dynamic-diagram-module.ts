import { DynamicTypes } from '@dynamic-glsp/protocol';
import {
  ConsoleLogger,
  ContainerConfiguration,
  DEFAULT_ALIGNABLE_ELEMENT_FILTER,
  DefaultTypes,
  FeatureModule,
  GCompartment,
  GEdge,
  GGraph,
  GLSPProjectionView,
  GLabel,
  GLabelView,
  GNode,
  HBoxLayouterExt,
  IDiagramOptions,
  IHelperLineOptions,
  LogLevel,
  PolylineEdgeViewWithGapsOnIntersections,
  STANDALONE_MODULE_CONFIG,
  TYPES,
  VBoxLayouterExt,
  ViewerOptions,
  accessibilityModule,
  bindOrRebind,
  configureDefaultModelElements,
  configureModelElement,
  createDiagramOptionsModule,
  edgeEditToolModule,
  exportModule,
  gridModule,
  helperLineModule,
  initializeDiagramContainer,
  overrideModelElement,
  saveModule,
  toolPaletteModule
} from '@eclipse-glsp/client';

import { Inspector } from '../features/inspector';
import { DynamicHBoxLayouter, DynamicLayouter, DynamicVBoxLayouter } from '../features/layouters';
import { SaveModelKeyboardListener } from '../features/save-model';
import { SvgExporter } from '../features/svg-exporter';
import { GShape } from '../model';
import { DynamicNodeView, DynamicShapeView } from '../views/dynamic-views';
import { ExternalServices } from './dynamic-external-services';
import { StartupConfiguration } from './dynamic-startup-configurations';
import { Container, ContainerModule } from 'inversify';

export const dynamicDiagramModule = (diagramOptions: IDiagramOptions) =>
  new ContainerModule((bind, unbind, isBound, rebind) => {
    const context = { bind, unbind, isBound, rebind };

    // configure utilities, actions and services that needs to be loaded previously to the model
    bind(StartupConfiguration).toSelf().inSingletonScope();
    bind(TYPES.IDiagramStartup).toService(StartupConfiguration);

    // configure custom layouters (for allow absolute and relative layout combined)
    bindOrRebind(context, TYPES.Layouter).to(DynamicLayouter).inSingletonScope();
    bindOrRebind(context, VBoxLayouterExt).to(DynamicVBoxLayouter);
    bindOrRebind(context, HBoxLayouterExt).to(DynamicHBoxLayouter);

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
        DEFAULT_ALIGNABLE_ELEMENT_FILTER(element) && !(element instanceof GCompartment) && !(element instanceof GShape);
      return options;
    });

    configureDefaultModelElements(context);

    // configure the GGraph (graphical model root element)
    // if editMode is editable: render the projection view (scrollbars for spanning the diagram)
    if (diagramOptions.editMode === 'editable')
      overrideModelElement(context, DefaultTypes.GRAPH, GGraph, GLSPProjectionView);

    // configure the GNode (graphical model node element) with the DynamicNodeView view to render nodes
    overrideModelElement(context, DefaultTypes.NODE, GNode, DynamicNodeView);

    // configure the GLabel (graphical model label element) with the GLabelView (default view for rendering labels)
    // and enable the edit label feature (double click on label to edit)
    overrideModelElement(context, DefaultTypes.LABEL, GLabel, GLabelView /*, { enable: [editLabelFeature] }*/); // disable edit label feature for now

    // configure the GEdge (graphical model edge element) with the PolylineEdgeViewWithGapsOnIntersections view to render edges with gaps on intersections
    overrideModelElement(context, DefaultTypes.EDGE, GEdge, PolylineEdgeViewWithGapsOnIntersections);

    // configure GShape (graphical model shape element) with the DynamicShapeView view to render shapes
    configureModelElement(context, DynamicTypes.SHAPE, GShape, DynamicShapeView);
  });

export function initializeDynamicDiagramContainer(
  diagramOptions: IDiagramOptions,
  viewerOptions: Partial<ViewerOptions>,
  externalServices: ExternalServices,
  ...extraModules: ContainerConfiguration
): Container {
  // create a new feature module for the external services (it can provide access to services outside GLSP)
  const externalServicesModule = new FeatureModule(
    (bind) => {
      bind(ExternalServices).toConstantValue(externalServices);
    },
    { featureId: Symbol('externalServices') }
  );

  // create a new container and load all the modules that are needed
  // the modules are a set of bindings and configurations already defined in the GLSP client that can be reused or extended
  // the dynamicDiagramModule contains base custom bindings for our dynamic diagram language
  return initializeDiagramContainer(
    new Container(),
    createDiagramOptionsModule(diagramOptions, viewerOptions),
    STANDALONE_MODULE_CONFIG, // contains a set of default modules for basic features like undo/redo, copy/paste, selection, etc.
    externalServicesModule, // load bindings for external services
    {
      add:
        diagramOptions.editMode === 'editable'
          ? [
              accessibilityModule, // load bindings for accessibility features
              gridModule, // load bindings for grid on the diagram and button to toggle the grid
              helperLineModule, // load bindings for helper lines for alignment
              edgeEditToolModule // load bindings for edge editing tool
            ]
          : [],
      remove: [toolPaletteModule, saveModule, exportModule]
    },
    dynamicDiagramModule(diagramOptions), // load all the bindings for the dynamic diagram language
    ...extraModules
  );
}
