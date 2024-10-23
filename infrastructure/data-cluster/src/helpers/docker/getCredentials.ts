interface IProps {
  credentials: string;
  serverUrl: string;
}

export const getCredentials = ({ credentials, serverUrl }: IProps) => {
  const auth = JSON.parse(credentials);
  const authToken = auth["auths"][serverUrl]["auth"];
  const decoded = Buffer.from(authToken, "base64").toString();
  const [username, password] = decoded.split(":");
  if (!password || !username) {
    throw new Error("Invalid credentials");
  }
  return {
    server: serverUrl,
    username: username,
    password: password,
  };
};
