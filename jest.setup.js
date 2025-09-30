const { toMatchSpecificSnapshot } = require("jest-specific-snapshot");

expect.extend({
  toMatchSpecificSnapshot,
});
