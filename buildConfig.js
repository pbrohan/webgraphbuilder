const isProduction = process.env.NODE_ENV == 'production';
const urlprefix = isProduction ? '/webgraphbuilder' : '';

const build_vars = {urlprefix}

export default build_vars