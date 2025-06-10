import "./sass/main.scss"; //Render sass
import * as d3 from 'd3';
import * as leaflet from 'leaflet';
import Grid from 'tui-grid';
import { initAll as govukInitAll } from 'govuk-frontend';
import data_check from './javascript/common/data_check'
import graph_tools from './javascript/common/graph_tools'
import msgBox from "./javascript/common/msgbox"
import colours from "./javascript/colours"
import { initMapPage } from "./javascript/maps/maps"
import { initInteractiveMapPage } from './javascript/maps/interactivemap';
import { initHomePage } from './javascript/home/home';
import { initDonutChartPage } from './javascript/donutchart/donutchart';
import { initOrgListSelect } from './javascript/common/palette';

// Custom initAll function that runs common initialization code
function initAll() {
  // Initialize GOV.UK components
  govukInitAll();
  
  // Initialize the org_list dropdown with localStorage persistence
  initOrgListSelect();
}

export {d3,
        Grid,
        initAll,
        data_check,
        graph_tools,
        msgBox,
        colours,
        leaflet,
        initMapPage,
        initInteractiveMapPage,
        initHomePage,
        initDonutChartPage};