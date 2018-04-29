export default func => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(func());
    });
  });
};
