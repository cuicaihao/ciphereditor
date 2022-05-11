
import { BlueprintNodeId } from 'slices/blueprint/types/blueprint'
import { UICanvasState, UIEmbedType, UIState } from './types'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { popModal, pushAddModal, pushSettingsModal } from './reducers'

const detectInitialEmbedType = (): UIEmbedType => {
  if (window.parent === window) {
    return UIEmbedType.Standalone
  }
  return UIEmbedType.Embed
}

const defaultUIState: UIState = {
  embedType: detectInitialEmbedType(),
  embedMaximized: false,

  canvasState: UICanvasState.Idle,
  canvasOffsetX: 0,
  canvasOffsetY: 0,
  canvasWidth: 1,
  canvasHeight: 1,

  modalStack: []
}

export const settingsSlice = createSlice({
  name: 'ui',
  initialState: defaultUIState,
  reducers: {
    applyEmbedTypeAction: (state, { payload }: PayloadAction<{
      embedType: UIEmbedType
    }>) => {
      state.embedType = payload.embedType
      if (state.embedType !== UIEmbedType.Platform) {
        state.embedMaximized = false
      }
    },
    toggleEmbedMaximizedAction: (state, { payload }: PayloadAction<{}>) => {
      if (state.embedType === UIEmbedType.Platform) {
        state.embedMaximized = !state.embedMaximized
      }
    },
    moveCanvasAction: (state, { payload }: PayloadAction<{
      x: number
      y: number
    }>) => {
      state.canvasOffsetX = payload.x
      state.canvasOffsetY = payload.y
    },
    updateCanvasSizeAction: (state, { payload }: PayloadAction<{
      width: number
      height: number
    }>) => {
      state.canvasWidth = payload.width
      state.canvasHeight = payload.height
    },
    startWireAction: (state, { payload }: PayloadAction<{
      controlId: BlueprintNodeId
    }>) => {
      if (state.canvasState === UICanvasState.Idle) {
        state.canvasState = UICanvasState.Wire
        state.wireDraft = { sourceControlId: payload.controlId }
      }
    },
    targetWireAction: (state, { payload }: PayloadAction<{
      controlId: BlueprintNodeId | undefined
    }>) => {
      if (state.canvasState === UICanvasState.Wire && state.wireDraft !== undefined) {
        state.wireDraft = {
          ...state.wireDraft,
          targetControlId: payload.controlId
        }
      }
    },
    endWireAction: (state, { payload }: PayloadAction<{}>) => {
      if (state.canvasState === UICanvasState.Wire) {
        state.canvasState = UICanvasState.Idle
        state.wireDraft = undefined
      }
    },
    pushAddModalAction: (state, { payload }: PayloadAction<{}>) => {
      pushAddModal(state)
    },
    pushSettingsModalAction: (state, { payload }: PayloadAction<{}>) => {
      pushSettingsModal(state)
    },
    cancelTopModalAction: (state, { payload }: PayloadAction<{}>) => {
      const cancelable =
        state.modalStack.length > 0 &&
        state.modalStack[state.modalStack.length - 1].cancelable
      if (cancelable) {
        popModal(state)
      }
    },
    popModalAction: (state, { payload }: PayloadAction<{}>) => {
      popModal(state)
    }
  }
})

export const {
  applyEmbedTypeAction,
  toggleEmbedMaximizedAction,
  moveCanvasAction,
  updateCanvasSizeAction,
  startWireAction,
  targetWireAction,
  endWireAction,
  pushAddModalAction,
  pushSettingsModalAction,
  cancelTopModalAction,
  popModalAction
} = settingsSlice.actions

export default settingsSlice.reducer
