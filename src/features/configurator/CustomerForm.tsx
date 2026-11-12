import { useState, type FormEvent } from 'react'
import type { Customer, CustomerDetails, Quote } from '../../domain/models.ts'
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
  /** The customer already on the quote, used to fill the form. */
  customer: Customer
  onOpenChange: (open: boolean) => void
  onSave: (customer: Customer) => Promise<boolean>
}

const EMPTY_DETAILS: CustomerDetails = {
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  town: '',
  county: '',
  country: 'United Kingdom',
  postcode: '',
}

/** Form fields for a customer. Older customers only kept a joined name and address, so split those. */
function joinedAddress(details: CustomerDetails): string {
  return [details.addressLine1, details.addressLine2, details.addressLine3, details.town, details.county, details.postcode, details.country]
    .map((value) => value.trim())
    .filter(Boolean)
    .join('\n')
}

function joinedName(details: CustomerDetails): string {
  return [details.firstName, details.lastName].map((value) => value.trim()).filter(Boolean).join(' ')
}

function detailsOf(customer: Customer): CustomerDetails {
  // Saved fields are used while they still match; the name or site address may have been edited elsewhere since.
  const saved = customer.details ? { ...EMPTY_DETAILS, ...customer.details } : null
  if (saved && joinedName(saved) === customer.name.trim() && joinedAddress(saved) === customer.address.trim()) return saved
  const [firstName = '', ...rest] = customer.name.trim().split(/\s+/)
  const lines = customer.address.split('\n').map((line) => line.trim()).filter(Boolean)
  return {
    ...EMPTY_DETAILS,
    firstName,
    lastName: rest.join(' '),
    addressLine1: lines[0] ?? '',
    addressLine2: lines[1] ?? '',
    addressLine3: lines.slice(2).join(', '),
  }
}

function sameDetails(a: CustomerDetails, b: CustomerDetails): boolean {
  return (Object.keys(a) as (keyof CustomerDetails)[]).every((key) => a[key].trim() === b[key].trim())
}

/**
 * Customer details for a quote. Opens filled with what is already saved, and asks
 * before overwriting saved details with changes.
 */
export function NewQuoteCustomerDialog({ open, customer, onOpenChange, onSave }: NewQuoteCustomerDialogProps) {
  const initial = detailsOf(customer)
  const [details, setDetails] = useState<CustomerDetails>(initial)
  const [email, setEmail] = useState(customer.email)
  const [phone, setPhone] = useState(customer.phone)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const existing = Boolean(customer.name.trim())
  const changed = !sameDetails(details, initial) || email.trim() !== customer.email.trim() || phone.trim() !== customer.phone.trim()

  function set<K extends keyof CustomerDetails>(key: K, value: string) {
    setDetails((current) => ({ ...current, [key]: value }))
    setConfirming(false)
  }

  async function save() {
    setSaving(true)
    const trimmed = Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value.trim()])) as unknown as CustomerDetails
    const saved = await onSave({
      ...customer,
      name: joinedName(trimmed),
      email: email.trim(),
      phone: phone.trim(),
      address: joinedAddress(trimmed),
      details: trimmed,
    })
    setSaving(false)
    setConfirming(false)
    if (saved) onOpenChange(false)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (saving || !details.firstName.trim()) return
    if (!changed) {
      onOpenChange(false)
      return
    }
    if (existing && !confirming) {
      setConfirming(true)
      return
    }
    void save()
  }

  const field = (key: keyof CustomerDetails, placeholder: string, props: { autoComplete?: string; full?: boolean; required?: boolean; autoFocus?: boolean } = {}) => (
    <label className={props.full ? 'customer-onboarding-full' : undefined}>
      <span className="sr-only">{placeholder.replace(' (optional)', '')}</span>
      <input
        className="input"
        value={details[key]}
        placeholder={placeholder}
        autoComplete={props.autoComplete}
        required={props.required}
        autoFocus={props.autoFocus}
        onChange={(event) => set(key, event.target.value)}
      />
    </label>
  )

  return (
    <Modal open={open} title="Customer details" className="dialog-customer" onOpenChange={onOpenChange}>
      <form className="customer-onboarding" onSubmit={submit}>
        <p className="dialog-copy">
          {existing ? 'Check or update the customer’s details for this quote.' : 'Add the customer’s details before choosing products for this quote.'}
        </p>
        <div className="customer-onboarding-grid">
          {field('firstName', 'First name', { autoComplete: 'given-name', required: true, autoFocus: true })}
          {field('lastName', 'Last name', { autoComplete: 'family-name' })}
          <label>
            <span className="sr-only">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              placeholder="Email (optional)"
              autoComplete="email"
              onChange={(event) => {
                setEmail(event.target.value)
                setConfirming(false)
              }}
            />
          </label>
          <label>
            <span className="sr-only">Phone</span>
            <input
              className="input"
              type="tel"
              value={phone}
              placeholder="Phone (optional)"
              autoComplete="tel"
              onChange={(event) => {
                setPhone(event.target.value)
                setConfirming(false)
              }}
            />
          </label>
          {field('addressLine1', 'Address line 1', { autoComplete: 'address-line1', full: true })}
          {field('addressLine2', 'Address line 2 (optional)', { autoComplete: 'address-line2', full: true })}
          {field('addressLine3', 'Address line 3 (optional)', { full: true })}
          {field('town', 'Town or city (optional)', { autoComplete: 'address-level2' })}
          {field('county', 'County (optional)', { autoComplete: 'address-level1' })}
          {field('country', 'Country', { autoComplete: 'country-name' })}
          {field('postcode', 'Postcode', { autoComplete: 'postal-code' })}
        </div>

        {confirming ? (
          <div className="confirm-strip" role="alertdialog" aria-live="polite" aria-label="Confirm changes">
            <p>Save these changes to the customer’s details?</p>
            <div className="confirm-strip-actions">
              <Button type="button" size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                Keep editing
              </Button>
              <Button type="submit" size="sm" disabled={saving} autoFocus>
                {saving ? 'Saving…' : 'Yes, save changes'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="dialog-actions">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : existing ? 'Save details' : 'Continue to products'}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  )
}
