import { useState, type FormEvent } from 'react'
import type { Customer, Quote } from '../../domain/models.ts'
import { supplyOptions } from '../../data/productCatalog.ts'
import { Button } from '../../components/ui/Button.tsx'
import { Modal } from '../../components/ui/Dialog.tsx'
import { SelectField, TextArea, TextField } from '../../components/ui/Field.tsx'

interface CustomerFormProps {
  quote: Quote
  onChange: (patch: Partial<Quote>) => void
}

export function CustomerForm({ quote, onChange }: CustomerFormProps) {
  const customer = quote.customer
  return (
    <section className="card" aria-labelledby="quote-details-heading">
      <div className="card-head">
        <h2 id="quote-details-heading">Quote details</h2>
        {/* <p>Who the quote is for, and where it will be installed.</p> */}
      </div>
      <div className="form-grid">
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

interface NewQuoteCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (customer: Customer) => Promise<boolean>
}

export function NewQuoteCustomerDialog({ open, onOpenChange, onSave }: NewQuoteCustomerDialogProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [addressLine3, setAddressLine3] = useState('')
  const [town, setTown] = useState('')
  const [county, setCounty] = useState('')
  const [country, setCountry] = useState('United Kingdom')
  const [postcode, setPostcode] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving || !firstName.trim()) return
    setSaving(true)
    const address = [addressLine1, addressLine2, addressLine3, town, county, postcode, country].map((value) => value.trim()).filter(Boolean).join('\n')
    const saved = await onSave({
      name: [firstName, lastName].map((value) => value.trim()).filter(Boolean).join(' '),
      email: email.trim(),
      phone: phone.trim(),
      address,
      salesperson: '',
    })
    setSaving(false)
    if (saved) onOpenChange(false)
  }

  return (
    <Modal open={open} title="Customer details" className="dialog-customer" onOpenChange={onOpenChange}>
      <form className="customer-onboarding" onSubmit={(event) => void submit(event)}>
        <p className="dialog-copy">Add the customer’s details before choosing products for this quote.</p>
        <div className="customer-onboarding-grid">
          <label>
            <span className="sr-only">First name</span>
            <input className="input" value={firstName} placeholder="First name" autoComplete="given-name" required autoFocus onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label>
            <span className="sr-only">Last name</span>
            <input className="input" value={lastName} placeholder="Last name" autoComplete="family-name" onChange={(event) => setLastName(event.target.value)} />
          </label>
          <label>
            <span className="sr-only">Email</span>
            <input className="input" type="email" value={email} placeholder="Email (optional)" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            <span className="sr-only">Phone</span>
            <input className="input" type="tel" value={phone} placeholder="Phone (optional)" autoComplete="tel" onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="customer-onboarding-full">
            <span className="sr-only">Address line 1</span>
            <input className="input" value={addressLine1} placeholder="Address line 1" autoComplete="address-line1" onChange={(event) => setAddressLine1(event.target.value)} />
          </label>
          <label className="customer-onboarding-full">
            <span className="sr-only">Address line 2</span>
            <input className="input" value={addressLine2} placeholder="Address line 2 (optional)" autoComplete="address-line2" onChange={(event) => setAddressLine2(event.target.value)} />
          </label>
          <label className="customer-onboarding-full">
            <span className="sr-only">Address line 3</span>
            <input className="input" value={addressLine3} placeholder="Address line 3 (optional)" onChange={(event) => setAddressLine3(event.target.value)} />
          </label>
          <label>
            <span className="sr-only">Town or city</span>
            <input className="input" value={town} placeholder="Town or city (optional)" autoComplete="address-level2" onChange={(event) => setTown(event.target.value)} />
          </label>
          <label>
            <span className="sr-only">County</span>
            <input className="input" value={county} placeholder="County (optional)" autoComplete="address-level1" onChange={(event) => setCounty(event.target.value)} />
          </label>
          <label>
            <span className="sr-only">Country</span>
            <input className="input" value={country} placeholder="Country" autoComplete="country-name" onChange={(event) => setCountry(event.target.value)} />
          </label>
          <label>
            <span className="sr-only">Postcode</span>
            <input className="input" value={postcode} placeholder="Postcode" autoComplete="postal-code" onChange={(event) => setPostcode(event.target.value)} />
          </label>
        </div>
        <div className="dialog-actions">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Continue to products'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
