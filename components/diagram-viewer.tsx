'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import type { UMLModel } from '@/app/page'

export function DiagramViewer({ umlModel }: { umlModel: UMLModel }) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  const mermaidCode = useMemo(() => {
    let diagram = 'classDiagram\n'

    umlModel.classes.forEach((umlClass) => {
      diagram += `  class ${umlClass.name} {\n`

      umlClass.attributes.forEach((attr) => {
        const visibility = attr.visibility === 'public' ? '+' : attr.visibility === 'private' ? '-' : '#'
        const safeName = attr.name.replace(/\s+/g, '_')
        diagram += `    ${visibility}${safeName}: ${attr.type}\n`
      })

      umlClass.methods.forEach((method) => {
        const visibility = method.visibility === 'public' ? '+' : method.visibility === 'private' ? '-' : '#'
        const params = method.parameters.map((p) => `${p.name}: ${p.type}`).join(', ')
        const safeMethod = method.name.replace(/\s+/g, '_')
        diagram += `    ${visibility}${safeMethod}(${params}): ${method.returnType}\n`
      })

      diagram += '  }\n'
    })

    umlModel.relationships.forEach((rel) => {
      const symbols: Record<string, string> = {
        association: '-->',
        aggregation: 'o--',
        composition: '*--',
        inheritance: '<|--',
        dependency: '..',
      }

      const symbol = symbols[rel.type] || '-->'
      
      // Build label with multiplicity information
      let fullLabel = rel.label || ''
      if (rel.multiplicity) {
        fullLabel += ` [${rel.multiplicity.from}..${rel.multiplicity.to}]`
      }
      
      const labelStr = fullLabel ? ` : ${fullLabel}` : ''
      diagram += `  ${rel.fromClass} ${symbol} ${rel.toClass}${labelStr}\n`
    })

    console.log('[v0] Generated Mermaid diagram:', diagram)
    return diagram
  }, [umlModel])

  useEffect(() => {
    const loadAndRenderMermaid = async () => {
      try {
        const { default: mermaid } = await import('mermaid')
        
        mermaid.initialize({ 
          startOnLoad: true,
          theme: 'default',
          securityLevel: 'loose',
          themeVariables: {
            primaryColor: '#e0e7ff',
            primaryTextColor: '#000000',
            primaryBorderColor: '#7c3aed',
            lineColor: '#7c3aed',
            secondBkgColor: '#f3f4f6',
            tertiaryTextColor: '#000000',
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
          },
          classDiagram: {
            fontSize: 18,
            diagramMarginX: 100,
            diagramMarginY: 100,
            padding: '20px',
            textHeight: 30,
            charWidth: 10,
          }
        })
        
        if (diagramRef.current) {
          diagramRef.current.innerHTML = `<div class="mermaid">\n${mermaidCode}\n</div>`
          await mermaid.contentLoaded()
          
          const svg = diagramRef.current.querySelector('svg')
          if (svg) {
            // Scale SVG to fit container width while maintaining aspect ratio
            svg.style.maxWidth = '100%'
            svg.style.height = 'auto'
            svg.style.display = 'block'
            svg.style.margin = '0 auto'
            
            const textElements = svg.querySelectorAll('text, tspan')
            textElements.forEach((el) => {
              const fontSize = el.getAttribute('font-size') || '16'
              const newSize = Math.max(parseInt(fontSize) * 1.4, 18)
              el.setAttribute('font-size', `${newSize}`)
              el.setAttribute('font-family', 'Arial, sans-serif')
            })

            const lines = svg.querySelectorAll('line, polyline')
            lines.forEach((el) => {
              const currentStroke = el.getAttribute('stroke-width') || '1'
              const newStroke = Math.max(parseFloat(currentStroke) * 1.3, 2)
              el.setAttribute('stroke-width', `${newStroke}`)
            })

            const paths = svg.querySelectorAll('path')
            paths.forEach((el) => {
              const currentStroke = el.getAttribute('stroke-width') || '1'
              const newStroke = Math.max(parseFloat(currentStroke) * 1.3, 2)
              el.setAttribute('stroke-width', `${newStroke}`)
              el.setAttribute('stroke', '#7c3aed')
              el.setAttribute('fill', 'none')
            })

            const rects = svg.querySelectorAll('rect')
            rects.forEach((el) => {
              el.setAttribute('fill', '#e0e7ff')
              el.setAttribute('stroke', '#7c3aed')
              el.setAttribute('stroke-width', '2')
            })
          }
        }
        
        setError(null)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[v0] Mermaid rendering error:', errorMsg)
        setError(`Mermaid rendering failed: ${errorMsg}`)
      }
    }

    if (mermaidCode && umlModel.classes.length > 0) {
      loadAndRenderMermaid()
    }
  }, [mermaidCode, umlModel.classes.length])

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}
      
      <div className="bg-white dark:bg-slate-950 border border-border rounded-lg overflow-auto">
        <div
          ref={diagramRef}
          className="p-8 min-h-96"
          style={{ minHeight: '800px' }}
        >
          {umlModel.classes.length === 0 ? (
            <div className="text-muted-foreground text-sm">No classes to display. Submit requirements first.</div>
          ) : (
            <div className="text-muted-foreground text-xs opacity-50">Rendering diagram...</div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-foreground">Classes: {umlModel.classes.length}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Relationships: {umlModel.relationships.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
