# WebGraphBuilder

WebGraphBuilder is a web-based tool for creating interactive and static choropleth maps of UK geographical data.

## Purpose

- Create printable static maps for publication
- Generate interactive maps for data exploration
- Visualize data across different UK administrative boundaries:
  - Counties
  - Local Authority Districts
  - Parliamentary Constituencies

## Features

- Automatic detection of geographic levels from area codes
- Data validation and error checking
- Color customization with different palettes
- Special insets for London and Shetland regions
- Support for both numerical and categorical data
- Export capabilities for created maps
- GOV.UK design system compliance

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pbrohan/webgraphbuilder.git
cd webgraphbuilder
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run serve
```

4. Visit `http://localhost:8080` in your browser

## Usage Guide

1. Choose between Printable Map or Interactive Map on the home page
2. Click "Show table" to display the input grid
3. Enter data in the format:
   - Column 1: Area codes (E-codes, e.g., E10000003 for counties)
   - Column 2: Values to be displayed on the map
4. Select map settings:
   - Geographic level (Counties, Districts, or Constituencies)
   - Year of boundaries
   - Color scheme
5. Toggle London or Shetland insets if needed
6. Download the map using the "Download Graph" button

## Technical Details

- Built with JavaScript, using D3.js for static maps and Leaflet for interactive maps
- Uses Eleventy (11ty) as a static site generator
- SASS/SCSS for styling with GOV.UK Frontend components
- Data grid powered by Toast UI Grid
- Packaged with Rollup

## Development Commands

- `npm run build`: Build for development
- `npm run build:production`: Build for production
- `npm run serve`: Start development server
- `npm run watch:sass`: Watch and compile SASS changes
- `npm run test`: Run tests