export interface UserInterface {
  userID?: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  password?: string;
  realmRoles: string;
  emailVerified: boolean;
  clientRoles: string;
  enabled?: boolean;
  additionalInfo?: object
}
