'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FileUp, Zap } from 'lucide-react'

export function RequirementInput({
  onSubmit,
  isLoading,
}: {
  onSubmit: (requirement: string) => void
  isLoading: boolean
}) {
  const [requirement, setRequirement] = useState('')

  const handleSubmit = () => {
    if (requirement.trim()) {
      onSubmit(requirement)
    }
  }

  const exampleRequirement = `Build a library management system with the following features:
- Books can be borrowed and returned by members
- Librarians manage the catalog and track loans
- Each book has a title, ISBN, author, and availability status
- Members have a membership ID and loan history
- Fines are charged for overdue books
- The system should track reservation requests`

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Describe your system requirements. The AI will extract entities, attributes, and relationships..."
        value={requirement}
        onChange={(e) => setRequirement(e.target.value)}
        rows={6}
        className="resize-none"
      />

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !requirement.trim()}
          className="flex-1"
        >
          <Zap className="w-4 h-4 mr-2" />
          {isLoading ? 'Processing...' : 'Extract UML'}
        </Button>
        <Button
          variant="outline"
          onClick={() => setRequirement(exampleRequirement)}
        >
          <FileUp className="w-4 h-4 mr-2" />
          Example
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: More detailed requirements lead to more accurate UML diagrams
      </p>
    </div>
  )
}
