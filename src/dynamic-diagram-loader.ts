import { Language, LanguageElement } from '@dynamic-glsp/protocol';
import {
  AnyObject,
  ApplicationIdProvider,
  DiagramLoader,
  DiagramLoadingOptions,
  GLSPClient,
  IDiagramOptions,
  IDiagramStartup,
  MaybePromise,
  Ranked,
  ResolvedDiagramLoadingOptions,
  TYPES,
  hasNumberProp
} from '@eclipse-glsp/client';

import { DynamicLanguageSpecification } from './features/dynamic-language-specification';
import { inject, injectable } from 'inversify';

export interface IDynamicDiagramOptions extends IDiagramOptions {
  language?: string | Language | LanguageElement;
  showcaseMode?: boolean;
}

export interface IDynamicDiagramStartup extends IDiagramStartup {
  preRequestLanguage?(): MaybePromise<void>;
  postRequestLanguage?(): MaybePromise<void>;
}

export namespace IDynamicDiagramStartup {
  export function is(object: unknown): object is IDynamicDiagramStartup {
    return (
      AnyObject.is(object) &&
      hasNumberProp(object, 'rank', true) &&
      ('preLoadDiagram' in object ||
        'preInitialize' in object ||
        'preRequestLanguage' in object ||
        'preRequestModel' in object ||
        'postRequestLanguage' in object ||
        'postRequestModel' in object ||
        'postModelInitialization' in object)
    );
  }
}

export interface DynamicDiagramLoadingOptions extends DiagramLoadingOptions {
  requestLanguageOptions: {
    language: string | Language | LanguageElement;
  };
}

export interface DynamicResolvedDiagramLoadingOptions extends ResolvedDiagramLoadingOptions {
  requestLanguageOptions: {
    language: string | Language | LanguageElement;
  };
}

@injectable()
export class DynamicDiagramLoader extends DiagramLoader {
  @inject(TYPES.IDiagramOptions)
  protected override options: IDynamicDiagramOptions;

  @inject(DynamicLanguageSpecification)
  protected language!: DynamicLanguageSpecification;

  override get diagramStartups(): IDynamicDiagramStartup[] {
    return this.lazyInjector.getAll<IDynamicDiagramStartup>(TYPES.IDiagramStartup);
  }

  async load(options: DiagramLoadingOptions = {}): Promise<void> {
    this.diagramStartups.sort(Ranked.sort);
    await this.invokeStartupHook('preLoadDiagram');
    const resolvedOptions: DynamicResolvedDiagramLoadingOptions = {
      requestLanguageOptions: {
        language: this.options.language
      },
      requestModelOptions: {
        sourceUri: this.options.sourceUri ?? '',
        diagramType: this.options.diagramType,
        ...options.requestModelOptions
      },
      initializeParameters: {
        applicationId: ApplicationIdProvider.get(),
        protocolVersion: GLSPClient.protocolVersion,
        ...options.initializeParameters
      },
      enableNotifications: options.enableNotifications ?? true
    };
    // Ensure that the action dispatcher is initialized before starting the diagram loading process
    await this.actionDispatcher.initialize?.();
    await this.invokeStartupHook('preInitialize');
    await this.initialize(resolvedOptions);
    await this.invokeStartupHook('preRequestLanguage');
    await this.requestLanguage(resolvedOptions);
    await this.invokeStartupHook('postRequestLanguage');
    await this.invokeStartupHook('preRequestModel');
    await this.requestModel(resolvedOptions);
    await this.invokeStartupHook('postRequestModel');
    await this.modelInitializationConstraint.onInitialized();
    await this.invokeStartupHook('postModelInitialization');
  }

  protected override async invokeStartupHook(hook: keyof Omit<IDynamicDiagramStartup, 'rank'>): Promise<void> {
    for (const startup of this.diagramStartups) {
      try {
        await startup[hook]?.();
      } catch (err) {
        console.error(`Error invoking diagram startup hook '${hook}':`, '\n', err);
      }
    }
  }

  protected async requestLanguage(options: DynamicResolvedDiagramLoadingOptions): Promise<void> {
    console.log('Requesting language', options?.requestLanguageOptions?.language);
    // load the language specification for the first time
    await this.language.sendLoadLanguageSpecificationAction();
  }
}
