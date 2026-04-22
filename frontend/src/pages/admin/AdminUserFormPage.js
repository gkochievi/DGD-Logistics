import React, { useEffect, useState } from 'react';
import {
  Form, Input, Button, Select, Switch, Typography, message, Spin, Modal, Tag,
  Upload, Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, MailOutlined, PhoneOutlined,
  LockOutlined, BankOutlined, KeyOutlined, ThunderboltOutlined,
  CopyOutlined, CheckOutlined, FileTextOutlined, UploadOutlined,
  DeleteOutlined, DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../contexts/LanguageContext';

const ACCEPT_CONTRACT = '.pdf,.doc,.docx,.odt,.rtf,.txt,.jpg,.jpeg,.png,.webp';
const MAX_CONTRACT_SIZE = 20 * 1024 * 1024;

function formatBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const { Title, Text } = Typography;

export default function AdminUserFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { t } = useLang();
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const lowers = 'abcdefghjkmnpqrstuvwxyz';
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const symbols = '!@#$%&*?';
    const all = lowers + uppers + digits + symbols;
    const rand = (set) => set[Math.floor(Math.random() * set.length)];
    const chars = [rand(lowers), rand(uppers), rand(digits), rand(symbols)];
    for (let i = chars.length; i < 14; i++) chars.push(rand(all));
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const pw = chars.join('');
    resetForm.setFieldsValue({ new_password: pw, confirm_password: pw });
    resetForm.validateFields(['new_password', 'confirm_password']).catch(() => {});
    setGeneratedPassword(pw);
    setCopied(false);
  };

  const copyGenerated = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error(t('adminUsers.copyFailed'));
    }
  };

  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractTitle, setContractTitle] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadingContract, setUploadingContract] = useState(false);

  const fetchUser = () => {
    if (!isEdit) return;
    setLoading(true);
    api.get(`/auth/admin/users/${id}/`).then(({ data }) => {
      setUserData(data);
      form.setFieldsValue(data);
    }).catch(() => message.error(t('adminUsers.noUsers')))
      .finally(() => setLoading(false));
  };

  const fetchContracts = () => {
    if (!isEdit) return;
    setContractsLoading(true);
    api.get(`/auth/admin/users/${id}/contracts/`).then(({ data }) => {
      setContracts(Array.isArray(data) ? data : []);
    }).catch(() => {})
      .finally(() => setContractsLoading(false));
  };

  useEffect(() => { fetchUser(); }, [id]); // eslint-disable-line
  useEffect(() => { fetchContracts(); }, [id]); // eslint-disable-line

  const handleContractUpload = async () => {
    if (!pendingFile) {
      message.warning(t('adminUsers.selectContractFile'));
      return;
    }
    setUploadingContract(true);
    try {
      const fd = new FormData();
      fd.append('document', pendingFile);
      if (contractTitle.trim()) fd.append('title', contractTitle.trim());
      await api.post(`/auth/admin/users/${id}/contracts/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success(t('adminUsers.contractUploaded'));
      setPendingFile(null);
      setContractTitle('');
      fetchContracts();
    } catch (err) {
      const detail = err.response?.data;
      const firstErr = detail ? Object.values(detail).flat()[0] : null;
      message.error(typeof firstErr === 'string' ? firstErr : t('adminUsers.contractUploadFailed'));
    } finally {
      setUploadingContract(false);
    }
  };

  const handleContractDelete = async (contractId) => {
    try {
      await api.delete(`/auth/admin/users/${id}/contracts/${contractId}/`);
      message.success(t('adminUsers.contractDeleted'));
      fetchContracts();
    } catch {
      message.error(t('adminUsers.contractDeleteFailed'));
    }
  };

  const handleReset = async (values) => {
    setResetting(true);
    try {
      await api.post(`/auth/admin/users/${id}/reset-password/`, {
        new_password: values.new_password,
      });
      message.success(t('adminUsers.passwordReset'));
      resetForm.resetFields();
      setGeneratedPassword('');
      setCopied(false);
      setResetOpen(false);
      fetchUser();
    } catch (err) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const firstErr = Object.values(detail).flat()[0];
        message.error(typeof firstErr === 'string' ? firstErr : t('adminUsers.failedResetPassword'));
      } else {
        message.error(t('adminUsers.failedResetPassword'));
      }
    } finally {
      setResetting(false);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/auth/admin/users/${id}/`, values);
        message.success(t('adminUsers.userUpdated'));
      } else {
        await api.post('/auth/admin/users/create/', values);
        message.success(t('adminUsers.userCreated'));
        navigate('/admin/users');
      }
    } catch (err) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const firstErr = Object.values(detail).flat()[0];
        message.error(typeof firstErr === 'string' ? firstErr : t('adminUsers.failedUpdateUser'));
      } else {
        message.error(t('adminUsers.failedUpdateUser'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Spin size="large" />
    </div>
  );

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }} className="page-enter">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 28,
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/users')}
          style={{ borderRadius: 10, border: '1px solid var(--border-color)' }}
        >
          {t('common.back')}
        </Button>
        <Title level={3} style={{
          margin: 0, fontWeight: 800, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}>
          {isEdit ? t('adminUsers.editUser') : t('adminUsers.createUser')}
        </Title>
      </div>

      {/* Form card */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        padding: 28,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ role: 'customer', user_type: 'personal', is_active: true }}
          requiredMark={false}
        >
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Form.Item
              name="first_name"
              label={<span style={{ fontWeight: 600 }}>{t('auth.firstName')}</span>}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Input prefix={<UserOutlined style={{ color: 'var(--text-tertiary)' }} />} style={{ borderRadius: 10 }} />
            </Form.Item>
            <Form.Item
              name="last_name"
              label={<span style={{ fontWeight: 600 }}>{t('auth.lastName')}</span>}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Input prefix={<UserOutlined style={{ color: 'var(--text-tertiary)' }} />} style={{ borderRadius: 10 }} />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label={<span style={{ fontWeight: 600 }}>{t('auth.email')}</span>}
            rules={[
              { required: true, message: t('common.required') },
              { type: 'email', message: t('auth.invalidEmail') },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: 'var(--text-tertiary)' }} />}
              disabled={isEdit}
              inputMode="email"
              autoComplete="email"
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item
            name="phone_number"
            label={<span style={{ fontWeight: 600 }}>{t('auth.phone')}</span>}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: 'var(--text-tertiary)' }} />}
              inputMode="tel"
              autoComplete="tel"
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Form.Item
              name="role"
              label={<span style={{ fontWeight: 600 }}>{t('adminUsers.role')}</span>}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Select
                options={[
                  { value: 'customer', label: t('adminUsers.customer') },
                  { value: 'admin', label: t('common.admin') },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="user_type"
              label={<span style={{ fontWeight: 600 }}>{t('adminUsers.userType')}</span>}
              rules={[{ required: true, message: t('common.required') }]}
              style={{ flex: 1, minWidth: 200 }}
            >
              <Select
                options={[
                  { value: 'personal', label: t('adminUsers.personal') },
                  { value: 'company', label: t('adminUsers.company') },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.user_type !== cur.user_type}>
            {({ getFieldValue }) =>
              getFieldValue('user_type') === 'company' ? (
                <div style={{
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent-bg-strong)',
                  borderRadius: 12,
                  padding: '20px 20px 4px',
                  marginBottom: 20,
                }}>
                  <Form.Item
                    name="company_name"
                    label={<span style={{ fontWeight: 600 }}>{t('adminUsers.companyName')}</span>}
                    rules={[{ required: true, message: t('common.required') }]}
                  >
                    <Input prefix={<BankOutlined style={{ color: 'var(--text-tertiary)' }} />} style={{ borderRadius: 10 }} />
                  </Form.Item>
                  <Form.Item
                    name="company_id"
                    label={<span style={{ fontWeight: 600 }}>{t('auth.companyId')}</span>}
                    rules={[
                      { required: true, message: t('common.required') },
                      { pattern: /^\d{11}$/, message: t('auth.companyIdInvalid') },
                    ]}
                    extra={<span style={{ color: 'var(--text-tertiary)' }}>{t('auth.companyIdHelp')}</span>}
                  >
                    <Input
                      placeholder={t('auth.companyIdPlaceholder')}
                      maxLength={11}
                      inputMode="numeric"
                      style={{ borderRadius: 10 }}
                    />
                  </Form.Item>
                </div>
              ) : null
            }
          </Form.Item>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: 'var(--bg-secondary)',
            borderRadius: 12, marginBottom: 20,
          }}>
            <div>
              <Text style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('common.active')}</Text>
              <br />
              <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Allow user to sign in
              </Text>
            </div>
            <Form.Item name="is_active" valuePropName="checked" style={{ margin: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          {!isEdit && (
            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 600 }}>{t('auth.password')}</span>}
              rules={[
                { required: true, message: t('common.required') },
                { min: 8, message: t('auth.minPassword') },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--text-tertiary)' }} />}
                style={{ borderRadius: 10 }}
              />
            </Form.Item>
          )}

          {isEdit && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', background: 'var(--bg-secondary)',
              borderRadius: 12, marginBottom: 20, gap: 12, flexWrap: 'wrap',
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('auth.password')}
                </Text>
                <br />
                {userData?.must_change_password ? (
                  <Tag color="orange" style={{ marginTop: 4 }}>
                    {t('adminUsers.mustChangePassword')}
                  </Tag>
                ) : (
                  <Text style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {t('adminUsers.resetPasswordDesc')}
                  </Text>
                )}
              </div>
              <Button
                icon={<KeyOutlined />}
                onClick={() => setResetOpen(true)}
                style={{ borderRadius: 10, fontWeight: 600 }}
              >
                {t('adminUsers.resetPassword')}
              </Button>
            </div>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              block
              size="large"
              style={{
                background: 'var(--accent)', borderColor: 'var(--accent)',
                borderRadius: 12, height: 48, fontWeight: 700,
                fontSize: 15,
              }}
            >
              {isEdit ? t('profile.saveChanges') : t('adminUsers.createUser')}
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* ── Contracts (company users only, edit mode) ── */}
      {isEdit && userData?.user_type === 'company' && (
        <div style={{
          marginTop: 24,
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 16,
          padding: 28,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
            fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
          }}>
            <FileTextOutlined style={{ color: 'var(--accent)' }} />
            {t('adminUsers.contractsSection')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 18 }}>
            {t('adminUsers.contractsHint')}
          </div>

          {/* Upload row */}
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 12,
            padding: 14, marginBottom: 14,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <Input
              placeholder={t('adminUsers.contractTitlePlaceholder')}
              value={contractTitle}
              onChange={(e) => setContractTitle(e.target.value)}
              maxLength={200}
              style={{ borderRadius: 10 }}
            />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Upload
                accept={ACCEPT_CONTRACT}
                showUploadList={false}
                beforeUpload={(file) => {
                  if (file.size > MAX_CONTRACT_SIZE) {
                    message.error(t('adminUsers.contractTooLarge'));
                    return false;
                  }
                  setPendingFile(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} style={{ borderRadius: 10 }}>
                  {pendingFile ? t('adminUsers.changeFile') : t('adminUsers.chooseFile')}
                </Button>
              </Upload>
              {pendingFile && (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {pendingFile.name} <span style={{ color: 'var(--text-tertiary)' }}>
                    ({formatBytes(pendingFile.size)})
                  </span>
                </span>
              )}
              <Button
                type="primary"
                onClick={handleContractUpload}
                loading={uploadingContract}
                disabled={!pendingFile}
                style={{
                  background: 'var(--accent)', borderColor: 'var(--accent)',
                  borderRadius: 10, fontWeight: 600, marginLeft: 'auto',
                }}
              >
                {t('adminUsers.uploadContract')}
              </Button>
            </div>
          </div>

          {contractsLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : contracts.length === 0 ? (
            <div style={{
              padding: '28px 16px', textAlign: 'center',
              background: 'var(--bg-secondary)', borderRadius: 12,
              color: 'var(--text-tertiary)', fontSize: 13,
            }}>
              {t('adminUsers.noContracts')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contracts.map((c) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: 'var(--bg-secondary)', borderRadius: 12,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'var(--accent-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)', fontSize: 16, flexShrink: 0,
                  }}>
                    <FileTextOutlined />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.title || c.original_filename || `Contract #${c.id}`}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {dayjs(c.created_at).format('DD MMM YYYY')}
                      {c.file_size ? ` · ${formatBytes(c.file_size)}` : ''}
                      {c.uploaded_by_name ? ` · ${c.uploaded_by_name}` : ''}
                    </div>
                  </div>
                  <Button
                    href={c.document_url}
                    target="_blank"
                    rel="noopener"
                    icon={<DownloadOutlined />}
                    style={{ borderRadius: 8 }}
                  />
                  <Popconfirm
                    title={t('adminUsers.deleteContractConfirm')}
                    onConfirm={() => handleContractDelete(c.id)}
                    okText={t('common.yes')}
                    cancelText={t('common.no')}
                  >
                    <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
                  </Popconfirm>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        title={t('adminUsers.resetPasswordTitle')}
        open={resetOpen}
        onCancel={() => {
          setResetOpen(false);
          resetForm.resetFields();
          setGeneratedPassword('');
          setCopied(false);
        }}
        footer={null}
        destroyOnClose
      >
        <Text style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 16 }}>
          {t('adminUsers.resetPasswordDesc')}
        </Text>
        <Form form={resetForm} layout="vertical" onFinish={handleReset} requiredMark={false}>
          <Button
            onClick={generatePassword}
            icon={<ThunderboltOutlined />}
            block
            style={{
              marginBottom: 14,
              borderRadius: 10, height: 40, fontWeight: 600,
              borderStyle: 'dashed',
              borderColor: 'var(--accent)',
              color: 'var(--accent)',
            }}
          >
            {t('adminUsers.generatePassword')}
          </Button>
          {generatedPassword && (
            <div style={{
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-bg-strong)',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{
                  display: 'block', fontSize: 11, fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  marginBottom: 2,
                }}>
                  {t('adminUsers.generatedPassword')}
                </Text>
                <Text
                  code
                  copyable={false}
                  style={{
                    fontSize: 15, fontWeight: 600,
                    color: 'var(--text-primary)',
                    wordBreak: 'break-all',
                  }}
                >
                  {generatedPassword}
                </Text>
              </div>
              <Button
                size="small"
                type={copied ? 'primary' : 'default'}
                icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                onClick={copyGenerated}
                style={{
                  borderRadius: 8, fontWeight: 600,
                  ...(copied ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : {}),
                }}
              >
                {copied ? t('adminUsers.copied') : t('adminUsers.copy')}
              </Button>
            </div>
          )}
          <Form.Item
            name="new_password"
            label={<span style={{ fontWeight: 600 }}>{t('adminUsers.newPassword')}</span>}
            rules={[
              { required: true, message: t('common.required') },
              { min: 8, message: t('auth.minPassword') },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--text-tertiary)' }} />}
              style={{ borderRadius: 10 }}
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label={<span style={{ fontWeight: 600 }}>{t('adminUsers.confirmResetPassword')}</span>}
            dependencies={['new_password']}
            rules={[
              { required: true, message: t('common.required') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                  return Promise.reject(new Error(t('auth.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--text-tertiary)' }} />}
              style={{ borderRadius: 10 }}
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={resetting}
              block
              icon={<KeyOutlined />}
              style={{
                background: 'var(--accent)', borderColor: 'var(--accent)',
                borderRadius: 12, height: 44, fontWeight: 700,
              }}
            >
              {t('adminUsers.resetPassword')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
