import React , { useState, useEffect , useContext } from 'react';
import {mustacheDiv} from "../../common/Utilities";
import {useLocation} from "react-router-dom";
import {RegionContext, RegionState} from "../Region/RegionContext";
import {ConfigurationUserInterface , ConfigurationWindow} from "../Configuration/ConfigurationModel";


interface Props { location : { search : string } };
interface QueryResult {};

declare let window : ConfigurationWindow;

const NotFound = (props : Props) => {
      const { config } = window;
      const query = new URLSearchParams(props.location.search).get('query');
      const default_message_template : string = `
      <p>
      {{#query}}Could not find page for <i>'{{query}}'</i>{{/query}} 
      {{^query}}An empty query <i>'${query}'</i> was supplied;<br> therefore, a page could not be found.{{/query}}
      </p>
      `
      const message_template : string = config?.userInterface?.notFound?.message_template || default_message_template;
      const parameters = { query };
      const loading = <div>loading ... </div>;
      return mustacheDiv(message_template, parameters);
}

export default NotFound