import { Building2, UserRound } from "lucide-react";
import ApplicationStatusBadge from "@/components/admin/ApplicationStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatLabel } from "@/lib/formatters";

function DetailItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-slate-200">
        {value ?? "—"}
      </dd>
    </div>
  );
}

export default function ApplicationDetailSummary({ application, customer }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserRound className="size-5 text-emerald-400" />
            <CardTitle>Submitted application</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailItem label="Full name" value={application.fullName} />
            <DetailItem label="Date of birth" value={formatDate(application.dateOfBirth, { dateOnly: true })} />
            <DetailItem label="Gender" value={formatLabel(application.gender)} />
            <DetailItem label="Nationality" value={application.nationality} />
            <DetailItem label="Phone number" value={application.phoneNumber} />
            <DetailItem label="Occupation" value={application.occupation} />
            <DetailItem label="Residential address" value={application.residentialAddress} />
            <DetailItem label="Status" value={<ApplicationStatusBadge status={application.applicationStatus} />} />
            <DetailItem label="Submitted" value={formatDate(application.submittedAt)} />
            <DetailItem label="Last updated" value={formatDate(application.updatedAt)} />
          </dl>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="size-5 text-emerald-400" />
            <CardTitle>Customer account</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailItem label="Account name" value={customer.fullName} />
            <DetailItem label="Email address" value={customer.email} />
            <DetailItem label="Phone number" value={customer.phoneNumber} />
            <DetailItem label="Role" value={formatLabel(customer.role)} />
            <DetailItem label="Account status" value={formatLabel(customer.accountStatus)} />
            <DetailItem label="Account created" value={formatDate(customer.accountCreatedAt)} />
            <DetailItem label="Customer ID" value={customer.id} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}