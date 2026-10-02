import { partCatalog } from '../../data/pricingDefaults.ts'
import { glazingOptions, materials } from '../../data/productCatalog.ts'
import type { PricingConfig } from '../../domain/models.ts'
import { useAppStore } from '../../store/useAppStore.ts'
import { Button } from '../../components/ui/Button.tsx'
import { Modal } from '../../components/ui/Dialog.tsx'
import { NumberField } from '../../components/ui/Field.tsx'

interface PricingSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PricingSetupDialog({ open, onOpenChange }: PricingSetupDialogProps) {
  const config = useAppStore((state) => state.pricingConfig)
  const setPricingConfig = useAppStore((state) => state.setPricingConfig)
  const resetPricingConfig = useAppStore((state) => state.resetPricingConfig)

  function patch(partial: Partial<PricingConfig>) {
    setPricingConfig({ ...config, ...partial })
  }

  return (
    <Modal open={open} title="Pricing setup" onOpenChange={onOpenChange}>
      <p className="dialog-copy">Demo rates for the pitch. New quotes pick up the VAT default. Markup applies to every price.</p>
      <div className="form-grid">
        <NumberField label="Markup" suffix="%" value={config.markupPercent} min={0} onChange={(markupPercent) => patch({ markupPercent })} />
        <NumberField
          label="Default VAT"
          suffix="%"
          value={config.taxPercent}
          min={0}
          onChange={(taxPercent) => patch({ taxPercent })}
        />
        {materials.map((material) => (
          <NumberField
            key={material.id}
            label={`${material.name} factor`}
            value={config.materialFactors[material.id] ?? material.factor}
            min={0}
            step={0.1}
            onChange={(value) => patch({ materialFactors: { ...config.materialFactors, [material.id]: value } })}
          />
        ))}
        {glazingOptions.map((option) => (
          <NumberField
            key={option.id}
            label={`${option.name} glass add £/m²`}
            value={config.glazingAddons[option.id] ?? option.addonPerM2}
            min={0}
            onChange={(value) => patch({ glazingAddons: { ...config.glazingAddons, [option.id]: value } })}
          />
        ))}
      </div>
      <h3 className="subhead">Part prices</h3>
      <div className="form-grid">
        {partCatalog.map((part) => (
          <NumberField
            key={part.id}
            label={`${part.name} £/${part.unit}`}
            value={config.partPrices[part.id] ?? part.price}
            min={0}
            step={0.1}
            onChange={(value) => patch({ partPrices: { ...config.partPrices, [part.id]: value } })}
          />
        ))}
      </div>
      <div className="dialog-actions">
        <Button variant="secondary" onClick={resetPricingConfig}>
          Reset rates
        </Button>
        <Button onClick={() => onOpenChange(false)}>Done</Button>
      </div>
    </Modal>
  )
}
