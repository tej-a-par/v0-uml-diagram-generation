'use client'

import { useState } from 'react'
import { RequirementInput } from '@/components/requirement-input'
import { DiagramViewer } from '@/components/diagram-viewer'
import { RefinementChatbot } from '@/components/refinement-chatbot'
import { ExportPanel } from '@/components/export-panel'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type UMLClass = {
  id: string
  name: string
  attributes: Array<{
    id: string
    name: string
    type: string
    visibility: 'public' | 'private' | 'protected'
  }>
  methods: Array<{
    id: string
    name: string
    returnType: string
    parameters: Array<{ name: string; type: string }>
    visibility: 'public' | 'private' | 'protected'
  }>
}

export type UMLRelationship = {
  id: string
  fromClass: string
  toClass: string
  type: 'association' | 'aggregation' | 'composition' | 'inheritance' | 'dependency'
  label?: string
  multiplicity?: { from?: string; to?: string }
}

export type UMLModel = {
  classes: UMLClass[]
  relationships: UMLRelationship[]
  description: string
}

export default function Home() {
  const [umlModel, setUmlModel] = useState<UMLModel>({
    classes: [],
    relationships: [],
    description: '',
  })
  const [activeTab, setActiveTab] = useState('diagram')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRequirementSubmit = async (requirement: string) => {
    setIsLoading(true)
    setError(null)
    console.log('[v0] Submitting requirement:', requirement.substring(0, 50) + '...')
    
    try {
      const response = await fetch('/api/extract-uml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement }),
      })

      console.log('[v0] API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[v0] Received UML model:', data)
        setUmlModel(data)
        setActiveTab('diagram')
      } else {
        const errorText = await response.text()
        console.error('[v0] API error response:', errorText)
        setError(`Error: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('[v0] Error extracting UML:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefinement = (updatedModel: UMLModel) => {
    setUmlModel(updatedModel)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            AI-Powered UML Diagram Generator
          </h1>
          <p className="text-muted-foreground text-lg">
            Two-stage system combining automated extraction with human-in-the-loop refinement
          </p>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Stage 1: Input Requirements</h2>
              <RequirementInput
                onSubmit={handleRequirementSubmit}
                isLoading={isLoading}
              />
              {error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded">
                  {error}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Stage 2: Refine & Validate</h2>
              <RefinementChatbot
                umlModel={umlModel}
                onRefinement={handleRefinement}
              />
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="diagram">UML Diagram</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
              </TabsList>

              <TabsContent value="diagram">
                <Card className="p-6">
                  {umlModel.classes.length > 0 ? (
                    <DiagramViewer umlModel={umlModel} />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        Submit requirements to generate UML diagram
                      </p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="export">
                <Card className="p-6">
                  {umlModel.classes.length > 0 ? (
                    <ExportPanel umlModel={umlModel} />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        No diagram to export yet
                      </p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </main>
  )
}
