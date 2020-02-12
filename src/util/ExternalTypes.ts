interface JSTreeNodeSettings {
    id?: string
    parent?: string
    text?: string
    icon?: string
    type?: string
    state?: JSTreeNodeState
    data?: JSTreeNodeData
    children?: boolean | (string | JSTreeNodeSettings)[]
    li_attr?: any
    a_attr?: any
}

interface JSTreeNodeData {
    type: number
    gamePath?: string
    archivePath?: string
    path?: string
}

interface JSTreeNodeState {
    opened?: boolean
    disabled?: boolean
    selected?: boolean
    checked?: boolean

    loading?: boolean
    loaded?: boolean
    failed?: boolean
}

interface JSTreeNode {
    id: string
    text: string
    icon: boolean | string
    parent: string | null
    parents: string[]
    children: string[]
    children_d: string[]
    data?: JSTreeNodeData
    state: JSTreeNodeState
    li_attr: any
    a_attr: any
    original?: JSTreeNodeSettings
    type: string
}

type JSTreeChildrenCallback = (children: JSTreeNodeSettings[]) => void;

interface JSTreeSelectedEventData {
    node: JSTreeNode
    selected: string[]
    event: Event
    instance: JSTree
}

interface JSTreeLoadEventData {
    node: JSTreeNode
    status: boolean
    instance: JSTree
}