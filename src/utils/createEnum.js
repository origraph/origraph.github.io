export default (values) => {
  let result = {};
  values.forEach(value => {
    result[value] = Symbol(value);
  });
  return Object.freeze(result);
};
