export const getEnvs = () => {
  return {
    DB_USER: process.env.DB_USER || "",
    DB_PASSWORD: process.env.DB_PASSWORD || "",
    DB_HOST: process.env.DB_HOST || "",
    DB_NAME: process.env.DB_NAME || "",
  };
};
