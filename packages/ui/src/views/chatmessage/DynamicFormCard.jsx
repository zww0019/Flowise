import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormHelperText,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Stack,
    TextField,
    Typography
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DynamicFormCard = ({ formSchema, onSubmit, customization, disabled, initialFormData, onFormDataChange }) => {
    const theme = useTheme()
    const [formData, setFormData] = useState({})
    const [formErrors, setFormErrors] = useState({})
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [showFeedback, setShowFeedback] = useState(false)
    const [feedback, setFeedback] = useState('')
    const [actionType, setActionType] = useState('proceed')

    // 初始化表单默认值
    useEffect(() => {
        if (!formSchema || !formSchema.fields) return

        // 如果有初始数据,优先使用初始数据
        if (initialFormData && Object.keys(initialFormData).length > 0) {
            setFormData(initialFormData)
            return
        }

        const initialData = {}
        formSchema.fields.forEach((field) => {
            if (field.defaultValue !== undefined) {
                initialData[field.name] = field.defaultValue
            } else if (field.type === 'checkbox') {
                // 如果有 options，初始化为空数组（多选）
                // 否则初始化为 false（单个布尔复选框）
                initialData[field.name] = (field.options && field.options.length > 0) ? [] : false
            } else {
                initialData[field.name] = ''
            }
        })
        setFormData(initialData)
    }, [formSchema, initialFormData])

    // 当表单数据变化时,通知父组件
    useEffect(() => {
        if (onFormDataChange && Object.keys(formData).length > 0) {
            onFormDataChange(formData)
        }
    }, [formData, onFormDataChange])

    // 验证单个字段
    const validateField = (field, value) => {
        // 必填验证
        if (field.required) {
            if (value === undefined || value === null || value === '') {
                return `${field.label}是必填项`
            }
            // Checkbox 类型验证
            if (field.type === 'checkbox') {
                // 如果有 options，检查数组是否有选择
                if (field.options && field.options.length > 0) {
                    if (!Array.isArray(value) || value.length === 0) {
                        return `${field.label}是必填项`
                    }
                } else {
                    // 单个布尔复选框
                    if (!value) {
                        return `${field.label}是必填项`
                    }
                }
            }
        }

        // 如果字段为空且非必填，跳过其他验证
        if (value === undefined || value === null || value === '') {
            return null
        }

        // Email验证
        if (field.type === 'email') {
            if (!emailRegex.test(value)) {
                return '请输入有效的邮箱地址'
            }
        }

        // Number验证
        if (field.type === 'number') {
            const numValue = Number(value)
            if (isNaN(numValue)) {
                return '请输入有效的数字'
            }
            if (field.validation?.min !== undefined && numValue < field.validation.min) {
                return `值不能小于 ${field.validation.min}`
            }
            if (field.validation?.max !== undefined && numValue > field.validation.max) {
                return `值不能大于 ${field.validation.max}`
            }
        }

        // Text/Textarea长度验证
        if (field.type === 'text' || field.type === 'textarea') {
            const strValue = String(value)
            if (field.validation?.min !== undefined && strValue.length < field.validation.min) {
                return `长度不能少于 ${field.validation.min} 个字符`
            }
            if (field.validation?.max !== undefined && strValue.length > field.validation.max) {
                return `长度不能超过 ${field.validation.max} 个字符`
            }
        }

        // 正则表达式验证
        if (field.validation?.pattern) {
            try {
                const regex = new RegExp(field.validation.pattern)
                if (!regex.test(String(value))) {
                    return '输入格式不正确'
                }
            } catch (e) {
                console.error('Invalid regex pattern:', field.validation.pattern)
            }
        }

        return null
    }

    // 验证所有字段
    const validateForm = () => {
        if (!formSchema || !formSchema.fields) return false

        const errors = {}
        formSchema.fields.forEach((field) => {
            const error = validateField(field, formData[field.name])
            if (error) {
                errors[field.name] = error
            }
        })

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    // 处理字段值变化
    const handleFieldChange = (fieldName, value) => {
        setFormData((prev) => ({ ...prev, [fieldName]: value }))
        // 清除该字段的错误
        setFormErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors[fieldName]
            return newErrors
        })
    }

    // 处理Proceed操作
    const handleProceed = (e) => {
        e.preventDefault()
        if (isSubmitted || disabled) return

        if (validateForm()) {
            setActionType('proceed')
            setShowFeedback(true)
        }
    }

    // 处理Reject操作
    const handleReject = (e) => {
        e.preventDefault()
        if (isSubmitted || disabled) return

        setActionType('reject')
        setShowFeedback(true)
    }

    // 确认提交
    const handleConfirmSubmit = () => {
        const type = actionType
        const data = type === 'proceed' ? formData : {}
        const feedbackText = feedback.trim() || undefined

        onSubmit(type, data, feedbackText)
        setIsSubmitted(true)
        setShowFeedback(false)
    }

    // 取消反馈对话框
    const handleCloseFeedback = () => {
        setShowFeedback(false)
        setFeedback('')
    }

    // 渲染字段
    const renderField = (field) => {
        const error = formErrors[field.name]
        const value = formData[field.name] || ''

        switch (field.type) {
            case 'text':
            case 'email':
                return (
                    <TextField
                        key={field.name}
                        fullWidth
                        type={field.type}
                        label={field.label}
                        placeholder={field.placeholder || field.label}
                        value={value}
                        disabled={isSubmitted || disabled}
                        required={field.required}
                        error={!!error}
                        helperText={error || field.description}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        size="small"
                    />
                )

            case 'number':
                return (
                    <TextField
                        key={field.name}
                        fullWidth
                        type="number"
                        label={field.label}
                        placeholder={field.placeholder || field.label}
                        value={value}
                        disabled={isSubmitted || disabled}
                        required={field.required}
                        error={!!error}
                        helperText={error || field.description}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        inputProps={{
                            min: field.validation?.min,
                            max: field.validation?.max
                        }}
                        size="small"
                    />
                )

            case 'textarea':
                return (
                    <TextField
                        key={field.name}
                        fullWidth
                        multiline
                        rows={4}
                        label={field.label}
                        placeholder={field.placeholder || field.label}
                        value={value}
                        disabled={isSubmitted || disabled}
                        required={field.required}
                        error={!!error}
                        helperText={error || field.description}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        size="small"
                    />
                )

            case 'select':
                return (
                    <FormControl key={field.name} fullWidth error={!!error} size="small">
                        <InputLabel>{field.label}</InputLabel>
                        <Select
                            value={value}
                            label={field.label}
                            disabled={isSubmitted || disabled}
                            required={field.required}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            MenuProps={{
                                disablePortal: true,
                                PaperProps: {
                                    style: {
                                        maxHeight: 300
                                    }
                                }
                            }}
                        >
                            <MenuItem value="">
                                <em>请选择...</em>
                            </MenuItem>
                            {field.options?.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                        {(error || field.description) && <FormHelperText>{error || field.description}</FormHelperText>}
                    </FormControl>
                )

            case 'checkbox':
                // 如果有 options，渲染为多选复选框组
                if (field.options && field.options.length > 0) {
                    const selectedValues = Array.isArray(value) ? value : []
                    return (
                        <FormControl key={field.name} error={!!error} fullWidth>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                {field.label}
                                {field.required && <span style={{ color: theme.palette.error.main }}> *</span>}
                            </Typography>
                            <Stack direction="column" spacing={1}>
                                {field.options.map((option) => (
                                    <FormControlLabel
                                        key={option.value}
                                        control={
                                            <Checkbox
                                                checked={selectedValues.includes(option.value)}
                                                disabled={isSubmitted || disabled}
                                                onChange={(e) => {
                                                    const newValues = e.target.checked
                                                        ? [...selectedValues, option.value]
                                                        : selectedValues.filter((v) => v !== option.value)
                                                    handleFieldChange(field.name, newValues)
                                                }}
                                            />
                                        }
                                        label={option.label}
                                    />
                                ))}
                            </Stack>
                            {(error || field.description) && <FormHelperText>{error || field.description}</FormHelperText>}
                        </FormControl>
                    )
                }
                // 否则渲染为单个布尔复选框
                return (
                    <FormControl key={field.name} error={!!error}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={value === true}
                                    disabled={isSubmitted || disabled}
                                    onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                                />
                            }
                            label={field.label + (field.required ? ' *' : '')}
                        />
                        {(error || field.description) && <FormHelperText>{error || field.description}</FormHelperText>}
                    </FormControl>
                )

            case 'radio':
                return (
                    <FormControl key={field.name} error={!!error}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            {field.label}
                            {field.required && <span style={{ color: theme.palette.error.main }}> *</span>}
                        </Typography>
                        <RadioGroup
                            value={value}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            disabled={isSubmitted || disabled}
                        >
                            {field.options?.map((option) => (
                                <FormControlLabel
                                    key={option.value}
                                    value={option.value}
                                    control={<Radio />}
                                    label={option.label}
                                    disabled={isSubmitted || disabled}
                                />
                            ))}
                        </RadioGroup>
                        {(error || field.description) && <FormHelperText>{error || field.description}</FormHelperText>}
                    </FormControl>
                )

            default:
                return null
        }
    }

    if (!formSchema || !formSchema.fields) {
        return null
    }

    return (
        <>
            <Card
                sx={{
                    mb: 1,
                    border: customization?.isDarkMode ? 'none' : '1px solid #e0e0e0',
                    borderRadius: `${customization?.borderRadius || 12}px`
                }}
            >
                <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* 表单标题和描述 */}
                        <Box>
                            <Typography variant="h6" sx={{ mb: 0.5 }}>
                                {formSchema.title}
                            </Typography>
                            {formSchema.description && (
                                <Typography variant="body2" color="text.secondary">
                                    {formSchema.description}
                                </Typography>
                            )}
                        </Box>

                        {/* 表单提交成功提示 */}
                        {isSubmitted && (
                            <Typography variant="body2" color="success.main">
                                {actionType === 'proceed' ? '表单已提交，感谢您的配合！' : '已拒绝表单提交。'}
                            </Typography>
                        )}

                        {/* 表单字段 */}
                        {!isSubmitted && (
                            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {formSchema.fields.map((field) => renderField(field))}

                                {/* 操作按钮 */}
                                <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 1 }}>
                                    <Button variant="outlined" onClick={handleReject} disabled={isSubmitted || disabled}>
                                        拒绝
                                    </Button>
                                    <Button variant="contained" onClick={handleProceed} disabled={isSubmitted || disabled}>
                                        确认
                                    </Button>
                                </Stack>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* 反馈对话框 */}
            <Dialog open={showFeedback} onClose={handleCloseFeedback} maxWidth="sm" fullWidth>
                <DialogTitle>{actionType === 'proceed' ? '是否需要添加备注？' : '请提供拒绝原因（可选）'}</DialogTitle>
                <DialogContent>
                    <TextField
                        multiline
                        rows={4}
                        fullWidth
                        placeholder={actionType === 'proceed' ? '添加备注（可选）...' : '拒绝原因（可选）...'}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseFeedback}>取消</Button>
                    <Button onClick={handleConfirmSubmit} variant="contained">
                        提交
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

DynamicFormCard.propTypes = {
    formSchema: PropTypes.object.isRequired,
    onSubmit: PropTypes.func.isRequired,
    customization: PropTypes.object,
    disabled: PropTypes.bool,
    initialFormData: PropTypes.object,
    onFormDataChange: PropTypes.func
}

export default DynamicFormCard
