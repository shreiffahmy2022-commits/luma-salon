import { getLocale, translator } from "@/lib/i18n";
import RegisterForm from "./form";

export default function RegisterPage() {
  const tt = translator(getLocale());
  const labels = {
    createSalon: tt("auth.createSalon"), registerSub: tt("auth.registerSub"),
    businessName: tt("auth.businessName"), orgPlaceholder: tt("auth.orgPlaceholder"),
    yourName: tt("auth.yourName"), namePlaceholder: tt("auth.namePlaceholder"),
    email: tt("auth.email"), passwordMin: tt("auth.passwordMin"),
    createAccount: tt("auth.createAccount"), creating: tt("auth.creating"),
    haveAccount: tt("auth.haveAccount"), signinLink: tt("auth.signinLink"),
  };
  return <RegisterForm labels={labels} />;
}
