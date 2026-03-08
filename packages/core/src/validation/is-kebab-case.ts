export const isKebabCase = (name: string): boolean =>
  /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)*$/.test(name);
