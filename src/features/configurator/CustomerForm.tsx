import type { Quote } from '../../domain/models.ts'
import { supplyOptions } from '../../data/productCatalog.ts'
import { SelectField, TextArea, TextField } from '../../components/ui/Field.tsx'

interface CustomerFormProps {
  quote: Quote
  onChange: (patch: Partial<Quote>) => void
}

export function CustomerForm({ quote, onChange }: CustomerFormProps) {
  const customer = quote.customer
  return (
    <section className="card" aria-labelledby="customer-heading">
      <div className="card-head">
        <h2 id="customer-heading">Customer & site</h2>
        <p>Who the quote is for, and where it will be installed.</p>
      </div>
      <div className="form-grid">
        <TextField
          label="Customer name"
          value={customer.name}
          autoComplete="name"
          placeholder="Test Customer"
          onChange={(name) => onChange({ customer: { ...customer, name } })}
        />
        <TextField
          label="Phone"
          value={customer.phone}
          autoComplete="tel"
          placeholder="07700 900000"
          onChange={(phone) => onChange({ customer: { ...customer, phone } })}
        />
        <TextField
          label="Email"
          type="email"
          value={customer.email}
          autoComplete="email"
          placeholder="name@example.com"
          onChange={(email) => onChange({ customer: { ...customer, email } })}
        />
        <TextField
          label="Salesperson"
          value={customer.salesperson}
          placeholder="Name on the quote"
          onChange={(salesperson) => onChange({ customer: { ...customer, salesperson } })}
        />
        <TextField
          label="Reference"
          value={quote.reference}
          placeholder="Front elevation"
          onChange={(reference) => onChange({ reference })}
        />
        <TextField label="Job number" value={quote.jobNo} onChange={(jobNo) => onChange({ jobNo })} />
        <SelectField label="Supply" value={quote.supply} onChange={(supply) => onChange({ supply })}>
          {supplyOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </SelectField>
        <TextField
          label="Requested date"
          type="date"
          value={quote.requestedDate}
          onChange={(requestedDate) => onChange({ requestedDate })}
        />
        <div className="span-2">
          <TextArea
            label="Site address"
            value={customer.address}
            placeholder="Street, town, postcode"
            onChange={(address) => onChange({ customer: { ...customer, address } })}
          />
        </div>
      </div>
    </section>
  )
}
