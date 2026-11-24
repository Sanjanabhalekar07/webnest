export type Account = {
  id: string;
  name: string;
  email: string;
};

export const accountInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
