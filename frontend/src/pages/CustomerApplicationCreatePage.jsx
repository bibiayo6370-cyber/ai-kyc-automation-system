import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FilePlus2, LoaderCircle } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useAuth from "@/hooks/useAuth";
import { createCustomerKycApplication, fetchMyKycApplication } from "@/services/customerKycService";

const applicationSchema = z.object({
  fullName: z.string().trim().min(3, "Full name must contain at least 3 characters").max(100, "Full name cannot exceed 100 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required").refine((value) => !Number.isNaN(new Date(value).getTime()), "Enter a valid date of birth").refine((value) => new Date(value) <= new Date(), "Date of birth cannot be in the future"),
  gender: z.enum(["male", "female", "other"], { error: "Select a gender" }),
  nationality: z.string().trim().min(2, "Nationality is required").max(60, "Nationality cannot exceed 60 characters"),
  residentialAddress: z.string().trim().min(10, "Enter a complete residential address").max(250, "Residential address cannot exceed 250 characters"),
  phoneNumber: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number containing 10–15 digits"),
  occupation: z.string().trim().min(2, "Occupation is required").max(100, "Occupation cannot exceed 100 characters")
});

export default function CustomerApplicationCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [serverError, setServerError] = useState("");

  const { control, register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(applicationSchema),
    defaultValues: { fullName: user?.fullName ?? "", dateOfBirth: "", gender: "", nationality: "Nigerian", residentialAddress: "", phoneNumber: "", occupation: "" }
  });

  useEffect(() => {
    const controller = new AbortController();

    async function checkExistingApplication() {
      try {
        const data = await fetchMyKycApplication({ signal: controller.signal });

        if (data.application?._id) navigate("/customer", { replace: true });
      } catch (error) {
        if (error.code === "ERR_CANCELED") return;
        if (error.response?.status !== 404) setServerError(error.response?.data?.message ?? "Unable to check your current KYC application.");
      } finally {
        if (!controller.signal.aborted) setIsCheckingExisting(false);
      }
    }

    checkExistingApplication();
    return () => controller.abort();
  }, [navigate]);

  async function onSubmit(values) {
    setServerError("");

    try {
      await createCustomerKycApplication(values);
      navigate("/customer", { replace: true, state: { applicationCreated: true } });
    } catch (error) {
      setServerError(error.response?.data?.message ?? "Your KYC application could not be created.");
    }
  }

  if (isCheckingExisting) {
    return (
      <div className="grid min-h-[60vh] place-items-center" aria-live="polite">
        <div className="flex items-center gap-3 text-slate-400">
          <LoaderCircle className="size-5 animate-spin text-emerald-400" />
          Checking your application status...
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white">
        <Link to="/customer"><ArrowLeft className="size-4" />Back to customer portal</Link>
      </Button>

      <div>
        <p className="text-sm font-medium text-emerald-400">Customer onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create KYC Application</h1>
        <p className="mt-3 max-w-3xl text-slate-400">Enter your personal information exactly as it appears on the identity document you will upload.</p>
      </div>

      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><FilePlus2 className="size-6" /></div>
            <div>
              <CardTitle>Personal and identity information</CardTitle>
              <CardDescription className="mt-1 text-slate-400">All fields are required. Review your entries before creating the application.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert>}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" autoComplete="name" className="border-slate-700 bg-slate-950 text-slate-100" aria-invalid={Boolean(errors.fullName)} {...register("fullName")} />
                {errors.fullName && <p className="text-sm text-red-400">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of birth</Label>
                <Input id="dateOfBirth" type="date" max={new Date().toISOString().split("T")[0]} className="border-slate-700 bg-slate-950 text-slate-100" aria-invalid={Boolean(errors.dateOfBirth)} {...register("dateOfBirth")} />
                {errors.dateOfBirth && <p className="text-sm text-red-400">{errors.dateOfBirth.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Controller control={control} name="gender" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="gender" className="w-full border-slate-700 bg-slate-950 text-slate-100" aria-invalid={Boolean(errors.gender)}><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                {errors.gender && <p className="text-sm text-red-400">{errors.gender.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input id="nationality" autoComplete="country-name" className="border-slate-700 bg-slate-950 text-slate-100" aria-invalid={Boolean(errors.nationality)} {...register("nationality")} />
                {errors.nationality && <p className="text-sm text-red-400">{errors.nationality.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone number</Label>
                <Input id="phoneNumber" type="tel" autoComplete="tel" placeholder="+2348012345678" className="border-slate-700 bg-slate-950 text-slate-100" aria-invalid={Boolean(errors.phoneNumber)} {...register("phoneNumber")} />
                {errors.phoneNumber && <p className="text-sm text-red-400">{errors.phoneNumber.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input id="occupation" autoComplete="organization-title" className="border-slate-700 bg-slate-950 text-slate-100" aria-invalid={Boolean(errors.occupation)} {...register("occupation")} />
                {errors.occupation && <p className="text-sm text-red-400">{errors.occupation.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="residentialAddress">Residential address</Label>
              <Textarea id="residentialAddress" rows={4} autoComplete="street-address" className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600" placeholder="Enter your complete residential address" aria-invalid={Boolean(errors.residentialAddress)} {...register("residentialAddress")} />
              {errors.residentialAddress && <p className="text-sm text-red-400">{errors.residentialAddress.message}</p>}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:justify-end">
              <Button asChild type="button" variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"><Link to="/customer">Cancel</Link></Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating application..." : "Create KYC application"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}