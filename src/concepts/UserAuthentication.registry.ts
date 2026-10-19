
import { registerConcept } from "@mit-sdg/sync-engine/assembly";

import {
  UserAuthenticationConcept,
  EmailAlreadyRegistered,
  UserNotFound,
  SessionNotFound,
} from "./UserAuthentication.js";

import spec from "@design/concepts/UserAuthentication.md" with { type: "text" };

export const userAuthentication = registerConcept({
  class: UserAuthenticationConcept,
  spec,
  refusals: {
    EMAIL_ALREADY_REGISTERED: EmailAlreadyRegistered,
    USER_NOT_FOUND: UserNotFound,
    SESSION_NOT_FOUND: SessionNotFound,
  },
});
