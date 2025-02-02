const { compileProgram, analyzeProgram } = require("nebula");

const parser = require("./parser").default;
const styles = require("./styles").default;
const generator = require("./generator").default;

module.exports.runProgram = (programText, params) => {
  const program = compileProgram(programText, params);
  const logger = console.log;
  console.log = x => {
    logger(x);
    return `${x}`;
  };
  // eslint-disable-next-line no-eval
  const response = eval(program);
  console.log = logger;
  return response;
};

module.exports.createConstructs = programText => {
  const program = analyzeProgram(programText);

  const constructs = [];
  const links = [];

  program.body.forEach(construct => {
    if (construct.getClassName() === "Link") {
      links.push(construct);
    } else {
      constructs.push(construct);
    }
  });
  return { constructs, links };
};

const locationToUnitCoords = loc => ({
  x: loc.coordinate.x.value,
  y: loc.coordinate.y.value,
});

const parseConstruct = construct => ({
  pos: locationToUnitCoords(construct.location),
  children: Array.isArray(construct.body)
    ? construct.body.filter(c => c.location).map(parseConstruct)
    : [],
  // styles: styles[construct.getClassName()],
  name: construct.getClassName(),
  info: parser(construct),
  id: construct.key,
});

const parseLink = construct => ({
  from: locationToUnitCoords(construct.from),
  to: locationToUnitCoords(construct.to),
  // styles: styles.linkNode,
  id: construct.key,
});

module.exports.generateProgram = (constructs, links) => {
  const createConstructText = (con, level) => {
    const children = con.children.map(con2 =>
      createConstructText(con2, level + 1)
    );
    const init = [con.info.init]
      .filter(x => x !== undefined && x !== null)
      .map(
        val =>
          `${"  ".repeat(level + 1)}initialize ${con.info.type} ${
            typeof val === "string" ? `"${val}"` : val
          }`
      );
    const access = [con.info.access]
      .filter(x => x !== undefined && x !== null)
      .map(val => `${"  ".repeat(level + 1)}access ${con.info.type} "${val}"`);
    return [
      `${"  ".repeat(level)}${generator(con)}`,
      ...init,
      ...access,
      ...children,
    ].join("\n");
  };

  const textConstructs = constructs.map(con => createConstructText(con, 0));
  const textLinks = links.map(
    link => `Link (${link.from.x}, ${link.from.y}) (${link.to.x}, ${link.to.y})`
  );
  return `${textConstructs.join("\n\n")}\n\n${textLinks.join("\n")}`;
};

module.exports.locationToUnitCoords = locationToUnitCoords;
module.exports.parseConstruct = parseConstruct;
module.exports.parseLink = parseLink;
