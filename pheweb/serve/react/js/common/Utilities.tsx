import React from "react";
import * as Handlebars from "handlebars";

/**
 * Compose fuction
 *
 * see : https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html
 *
 * @param f
 * @param g
 */
export function compose<A, B, C>(
  f: (arg: A) => B,
  g: (arg: B) => C
): (arg: A) => C {
  return (x) => g(f(x));
}

/**
 * Get url
 *
 * Takes a setter and an optional transformation and a fetchURL
 * Fetches url as a json object.  Calls the sink with the resulting
 * json.  If there is an error it's sent to the console.
 *
 * @param url
 * @param sink
 * @param fetchURL
 */
export const get: <X>(url: string, sink: (x: X) => void) => Promise<void> = (
  url,
  sink
) =>
  fetch(url)
    .then((response) => response.json())
    .then(sink)
    .catch(console.error);
/**
 * mustacheDiv
 *
 * return a div that contains as it's inner html
 * the output of a mustache template expanded using
 * the given context
 */
export const mustacheDiv: <X>(template: string, content: X) => JSX.Element = (
  template,
  content
) => (
  <div
    dangerouslySetInnerHTML={{ __html: Handlebars.compile(template)(content) }}
  ></div>
);

/**
 * mustacheSpan
 *
 * return a span that contains as it's inner html
 * the output of a mustache template expanded using
 * the given context
 */
export const mustacheSpan: <X>(template: string, content: X) => JSX.Element = (
  template,
  content
) => (
  <span
    dangerouslySetInnerHTML={{ __html: Handlebars.compile(template)(content) }}
  ></span>
);

/**
 * mustacheText
 *
 * return a span that contains as it's inner html
 * the output of a mustache template expanded using
 * the given context
 */
export const mustacheText: <X>(template: string, content: X) => string = (
  template,
  content
) => Handlebars.compile(template)(content);
