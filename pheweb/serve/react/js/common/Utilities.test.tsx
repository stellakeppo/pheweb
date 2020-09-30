/* eslint-env jest */
// https://stackoverflow.com/questions/59833839/swap-one-typescript-type-with-another-inside-an-object
import React from "react"
import {compose, get} from "./Utilities";

test('get search results : trivial', () => {
    expect(compose((x : number) => x * 2,(y: number) => y * 3 )(5)).toBe(30)
});

test('get', async () => {
    const response : Response =  { json : () => Promise.resolve({ key : "1" }) } as Response;
    const fetchURL : (input: RequestInfo, init?: RequestInit) => Promise<Response> = (input: RequestInfo, init?: RequestInit) => Promise.resolve(response);
    global.fetch = jest.fn(fetchURL);
    get("url",console.log);
});
