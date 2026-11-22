/* Languages shipped with the library. A new language is one more file in this folder, registered here. */
import { de } from './de.ts';
import { en } from './en.ts';
import { es } from './es.ts';
import { fr } from './fr.ts';
import { it } from './it.ts';
import { ja } from './ja.ts';
import { ko } from './ko.ts';
import { nl } from './nl.ts';
import { pt } from './pt.ts';
import { ru } from './ru.ts';
import { zh } from './zh.ts';

export const LOCALES = { en, fr, de, es, it, pt, nl, ru, zh, ja, ko } as const;
