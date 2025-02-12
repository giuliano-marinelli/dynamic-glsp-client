import { AModelRootSchema, Language, LanguageElement } from '@dynamic-glsp/protocol';
import { IActionDispatcher } from '@eclipse-glsp/client';

export const ExternalServices = Symbol('ExternalServices');

export interface ExternalServices {
  inspectorCreateElement?: (
    container: HTMLElement,
    elementId: string,
    elementAModel: AModelRootSchema,
    elementModel: any
  ) => void;
  inspectorElementChanged?: (elementId: string, newModel: any) => void;
  language?: string | Language | LanguageElement;
  showcaseMode?: boolean;
  actionDispatcher?: IActionDispatcher;
  reloadLanguage?: () => Promise<void>;
  getSVG?: () => string;
}
