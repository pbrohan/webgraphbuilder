import { set_palette } from "../common/palette";

export function initHomePage(){
  const org_list = document.getElementById("org_list");

  set_palette(org_list, function () {});
  org_list.addEventListener("change", (event) => {
    set_palette(event.target, function () {});
  });
}