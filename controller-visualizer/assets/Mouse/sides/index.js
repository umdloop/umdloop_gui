const modules = import.meta.glob("./*.svg", {
  eager: true,
  query: "?react", //Apparently this is the part that helps it out
  import: "default"
});

export const MouseIcons = Object.fromEntries(
  Object.entries(modules).map(([path, component]) => {
    const name = path.split("/").pop().replace(".svg", "").toLowerCase();
    return [name, component];
  })
);