import { getLocale, translator } from "@/lib/i18n";
import LoginForm from "./form";

export default function LoginPage() {
  const tt = translator(getLocale());
  const labels = {
    salonManager: tt("auth.salonManager"), welcome: tt("auth.welcome"), signinSub: tt("auth.signinSub"),
    email: tt("auth.email"), password: tt("auth.password"), signin: tt("auth.signin"), signingIn: tt("auth.signingIn"),
    newHere: tt("auth.newHere"), createSalon: tt("auth.createSalon"),
  };
  return <LoginForm labels={labels} />;
}
