'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { UMLModel } from '@/app/page'
import { Download, Copy, BarChart3 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AnalysisDashboard } from './analysis-dashboard'

export function ExportPanel({ umlModel }: { umlModel: UMLModel }) {
  const [copied, setCopied] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const { toast } = useToast()

  const generateMermaidCode = () => {
    let code = 'classDiagram\n'

    umlModel.classes.forEach((cls) => {
      code += `  class ${cls.name} {\n`
      cls.attributes.forEach((attr) => {
        const vis = attr.visibility === 'public' ? '+' : attr.visibility === 'private' ? '-' : '#'
        code += `    ${vis} ${attr.name}: ${attr.type}\n`
      })
      cls.methods.forEach((method) => {
        const vis = method.visibility === 'public' ? '+' : method.visibility === 'private' ? '-' : '#'
        const params = method.parameters.map((p) => `${p.name}: ${p.type}`).join(', ')
        code += `    ${vis} ${method.name}(${params}): ${method.returnType}\n`
      })
      code += '  }\n'
    })

    umlModel.relationships.forEach((rel) => {
      const symbols: Record<string, string> = {
        association: '--',
        aggregation: 'o--',
        composition: '*--',
        inheritance: '|--',
        dependency: '..>',
      }
      const symbol = symbols[rel.type] || '--'
      code += `  ${rel.fromClass} ${symbol} ${rel.toClass}\n`
    })

    return code
  }

  const handleCopy = () => {
    const code = generateMermaidCode()
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: 'Copied to clipboard',
        description: 'Mermaid code is ready to use',
      })
    })
  }

  const handleDownload = () => {
    const code = generateMermaidCode()
    const element = document.createElement('a')
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(code)}`)
    element.setAttribute('download', 'uml-diagram.mmd')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const stats = {
    totalClasses: umlModel.classes.length,
    totalAttributes: umlModel.classes.reduce((sum, cls) => sum + cls.attributes.length, 0),
    totalMethods: umlModel.classes.reduce((sum, cls) => sum + cls.methods.length, 0),
    totalRelationships: umlModel.relationships.length,
  }

  if (showAnalysis) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setShowAnalysis(false)}
          className="mb-4"
        >
          ← Back to Export
        </Button>
        <AnalysisDashboard umlModel={umlModel} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Analysis & Statistics</h3>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-muted/50">
            <p className="text-2xl font-bold text-primary">{stats.totalClasses}</p>
            <p className="text-sm text-muted-foreground">Classes</p>
          </Card>
          <Card className="p-4 bg-muted/50">
            <p className="text-2xl font-bold text-primary">{stats.totalAttributes}</p>
            <p className="text-sm text-muted-foreground">Attributes</p>
          </Card>
          <Card className="p-4 bg-muted/50">
            <p className="text-2xl font-bold text-primary">{stats.totalMethods}</p>
            <p className="text-sm text-muted-foreground">Methods</p>
          </Card>
          <Card className="p-4 bg-muted/50">
            <p className="text-2xl font-bold text-primary">{stats.totalRelationships}</p>
            <p className="text-sm text-muted-foreground">Relationships</p>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Export Options</h3>

        <div className="space-y-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="w-full justify-start"
          >
            <Copy className="w-4 h-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Mermaid Code'}
          </Button>

          <Button
            onClick={handleDownload}
            variant="outline"
            className="w-full justify-start"
          >
            <Download className="w-4 h-4 mr-2" />
            Download .mmd File
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Comparative Analysis</h3>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => setShowAnalysis(true)}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          View Performance Report
        </Button>
        <p className="text-xs text-muted-foreground">
          Compare automated extraction accuracy against baseline and human-only methods
        </p>
      </div>
    </div>
  )
}
