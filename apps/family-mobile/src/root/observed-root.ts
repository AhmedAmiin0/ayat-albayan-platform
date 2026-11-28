import { Observe, ObserveRoot } from 'expo-observe';
import { FamilyRootLayout } from './FamilyRootLayout';

/**
 * Every dynamic segment (app/<route>/[id]) and query param (?student=&rec=&direct=) of the app's
 * routes: route timings keep the route name, and no student, lesson, report or chat id leaves
 * the phone in a param or url.
 */
const ROUTE_PARAMS = ['id', 'student', 'rec', 'direct'];

// At module scope: the router integration must be on before the first screen mounts.
Observe.configure({ integrations: { 'expo-router': { filteredParams: ROUTE_PARAMS } } });

/** The root layout measured by EAS Observe (launch, time to render, time to interactive). */
export const ObservedRootLayout = ObserveRoot.wrap(FamilyRootLayout);
