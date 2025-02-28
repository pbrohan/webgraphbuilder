# Features to add 

- [x] Table to insert data
- [x] Table appears/disappears
- [x] Button to generate graph
- [ ] Option to make interactive/static graph
- [x] Way of checking data for graph
- [x] When more complicated make JSON to find correct map
- [x] When the page changes (specifically when the map data level is changed by the parser, fire an event and tell the user)

All GeoJSON files are BUC (closest 200m) to save space (still big :())

# How does the maps page decide what data you've entered?

1. **Check the list of Ecodes for duplicates** If there are any, throw an error
2. **Check the list of Ecodes for districts or counties** If both are found, throw an error. If one is found but the user has selected the other (e.g. if the ecode for a district is in the list but the user has selected "Counties") select the correct option
3. **Check the list of Ecodes against the list of correct Ecodes for the level** If any non-blank rows contain an unrecognised Ecode, throw an error
4. **Check the data column for numbers** If every row is a number or blank, use a continuous scale, and render the graph, otherwise keep checking
5. **Count the number of unique values** If there are more than 7, throw an error
6. **Check if the user has indicated that the values are ordered** The order is assumed to be the order in which each unique value first appears. Set the palette to shades of the colour selected and render the graph. Otherwise
7. Set the palette to the default palette for the selected department and render the graph.