import Grid from 'tui-grid';

let data_table = null;

/**
 * Adds an input table to page as child of container
 * Probably want to move to bundle
 * @param {HTMLElement} container
 */
export function add_grid(container, build_graph, columns) {
  data_table = new Grid({
    usageStatistics: false, // Don't use google analytics
    el: container,
    scrollX: false,
    scrollY: true,
    columns: columns,
    data: [],
  });

  data_table.on("afterChange", function () {
    build_graph();
  });

  document.getElementById("grid-clear").addEventListener("click", () => {
    data_table.clear();
    build_graph();
  });
}

export function get_grid() {
  return data_table;
}

export function get_table_range(data) {
  var min = Infinity,
    max = -Infinity;
  for (let d in data) {
    let val = parseFloat(data[d].data);
    if (val < min) {
      min = val;
    }
    if (val > max) {
      max = val;
    }
  }
  return [min, max];
}
