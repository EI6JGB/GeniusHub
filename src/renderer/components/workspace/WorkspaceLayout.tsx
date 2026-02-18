import { useEffect, useRef, useState, useCallback } from 'react'
import { Layout, Model, TabNode, TabSetNode, BorderNode, ITabSetRenderValues, Actions, DockLocation } from 'flexlayout-react'
import 'flexlayout-react/style/dark.css'
import { useLayoutStore } from '../../store/layoutStore'
import { widgetRegistry, widgetOrder } from './widgetRegistry'

export function WorkspaceLayout() {
  const { layout, setLayout, resetLayout } = useLayoutStore()
  const [model, setModel] = useState<Model>(() => Model.fromJson(layout))
  const [showPicker, setShowPicker] = useState(false)
  const [targetTabSetId, setTargetTabSetId] = useState<string | null>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>(JSON.stringify(layout))

  // Rebuild model when layout is loaded from store (startup only)
  useEffect(() => {
    const layoutStr = JSON.stringify(layout)
    if (layoutStr !== lastSavedRef.current) {
      lastSavedRef.current = layoutStr
      setModel(Model.fromJson(layout))
    }
  }, [layout])

  // Debounced save on user drag/resize interactions
  const handleModelChange = useCallback((newModel: Model) => {
    setModel(newModel)
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      const json = newModel.toJson()
      lastSavedRef.current = JSON.stringify(json)
      setLayout(json)
    }, 500)
  }, [setLayout])

  // Widget factory — renders the right device component per tab
  const factory = useCallback((node: TabNode) => {
    const id = node.getComponent() ?? ''
    const def = widgetRegistry[id]
    if (!def) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          Unknown widget: {id}
        </div>
      )
    }
    const Widget = def.component
    return <Widget />
  }, [])

  // Which widget IDs are already present in the layout
  const getExistingWidgets = useCallback((): Set<string> => {
    const existing = new Set<string>()
    model.visitNodes(node => {
      if (node.getType() === 'tab') {
        const comp = (node as TabNode).getComponent()
        if (comp) existing.add(comp)
      }
    })
    return existing
  }, [model])

  // Render "+" button on each tabset header when widgets are available to add
  const onRenderTabSet = useCallback((
    node: TabSetNode | BorderNode,
    renderValues: ITabSetRenderValues,
  ) => {
    if (!(node instanceof TabSetNode)) return
    const existing = getExistingWidgets()
    const available = widgetOrder.filter(id => !existing.has(id))
    if (available.length === 0) return

    renderValues.stickyButtons.push(
      <button
        key="add-widget"
        title="Add widget to this panel"
        className="flexlayout__tab_toolbar_button gh-add-widget-btn"
        onClick={() => {
          setTargetTabSetId(node.getId())
          setShowPicker(true)
        }}
      >
        +
      </button>,
    )
  }, [getExistingWidgets])

  // Add a widget to the target tabset
  const handleAdd = useCallback((widgetId: string) => {
    if (!targetTabSetId) return
    const def = widgetRegistry[widgetId]
    if (!def) return
    model.doAction(
      Actions.addNode(
        { type: 'tab', name: def.label, component: widgetId },
        targetTabSetId,
        DockLocation.CENTER,
        -1,
        true,
      ),
    )
    setShowPicker(false)
    setTargetTabSetId(null)
  }, [model, targetTabSetId])

  const availableWidgets = widgetOrder.filter(id => !getExistingWidgets().has(id))

  return (
    <div className="flex-1 relative overflow-hidden min-h-0">
      <Layout
        model={model}
        factory={factory}
        onModelChange={handleModelChange}
        onRenderTabSet={onRenderTabSet}
      />

      {/* Widget picker modal */}
      {showPicker && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
          onClick={() => setShowPicker(false)}
        >
          <div
            className="rounded-xl border border-gray-700 shadow-2xl p-5 w-64"
            style={{ background: 'var(--bg-elevated)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-200 tracking-wide uppercase">Add Widget</h3>
              <button
                onClick={() => setShowPicker(false)}
                className="text-gray-500 hover:text-white text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {availableWidgets.map(id => (
                <button
                  key={id}
                  onClick={() => handleAdd(id)}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
                >
                  {widgetRegistry[id].label}
                </button>
              ))}
              {availableWidgets.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">All widgets are in the layout</p>
              )}
            </div>

            <div className="border-t border-gray-700 mt-4 pt-3">
              <button
                onClick={() => { resetLayout(); setShowPicker(false) }}
                className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors text-left"
              >
                Reset to default layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
