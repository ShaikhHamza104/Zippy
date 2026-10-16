// client/src/pages/admin/AdminAuditLogsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  Key,
  CheckCircle,
  XCircle,
  Code,
} from 'lucide-react';
import { apiFetch } from '../../services/api.js';
import {
  Button,
  Input,
  Card,
  Badge,
  Modal,
  Skeleton,
  EmptyState,
} from '../../components/ui/index.js';

export const AdminAuditLogsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'audit'; // 'audit' | 'login'
  const page = parseInt(searchParams.get('page') || '1', 10);
  const filterQuery = searchParams.get('q') || '';

  const [inputVal, setInputVal] = useState(filterQuery);
  const [selectedLogDetails, setSelectedLogDetails] = useState(null);

  // Switch Tab
  const handleTabChange = (tab) => {
    const newParams = new URLSearchParams();
    newParams.set('tab', tab);
    newParams.set('page', '1');
    setInputVal('');
    setSearchParams(newParams);
  };

  // Search Filter Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (inputVal.trim()) {
      newParams.set('q', inputVal.trim());
    } else {
      newParams.delete('q');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Page change
  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  // 1. Fetch Operational Audit Logs
  const {
    data: auditData,
    isLoading: isLoadingAudit,
    isFetching: isFetchingAudit,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ['adminAuditLogs', { page, filterQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (filterQuery) params.set('action', filterQuery);

      const res = await apiFetch(`/api/v1/admin/audit-logs?${params.toString()}`);
      return res;
    },
    enabled: activeTab === 'audit',
    keepPreviousData: true,
  });

  // 2. Fetch Authentication Login Logs
  const {
    data: loginData,
    isLoading: isLoadingLogin,
    isFetching: isFetchingLogin,
    refetch: refetchLogin,
  } = useQuery({
    queryKey: ['adminLoginLogs', { page, filterQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (filterQuery) params.set('email', filterQuery);

      const res = await apiFetch(`/api/v1/admin/login-logs?${params.toString()}`);
      return res;
    },
    enabled: activeTab === 'login',
    keepPreviousData: true,
  });

  const auditLogs = auditData?.data?.auditLogs || [];
  const auditPagination = auditData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const loginLogs = loginData?.data?.loginLogs || [];
  const loginPagination = loginData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const isFetching = isFetchingAudit || isFetchingLogin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Security & Compliance Logs
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Immutable audit trails of administrator mutations, customer account updates, and
            authentication events.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => (activeTab === 'audit' ? refetchAudit() : refetchLogin())}
          disabled={isFetching}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => handleTabChange('audit')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Operational Audit Logs</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('login')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'login'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Authentication & Login Logs</span>
        </button>
      </div>

      {/* Search Bar */}
      <Card className="p-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder={
                activeTab === 'audit'
                  ? 'Filter by action code (e.g. UPDATE_STOCK, CREATE_PRODUCT, CANCEL_ORDER)...'
                  : 'Filter by login attempt email address...'
              }
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
          <Button type="submit" variant="primary" size="sm" className="h-10">
            Filter
          </Button>
        </form>
      </Card>

      {/* ======================================================================
          TAB 1: OPERATIONAL AUDIT LOGS
         ====================================================================== */}
      {activeTab === 'audit' && (
        <Card className="overflow-hidden shadow-xs">
          {isLoadingAudit ? (
            <div className="p-6 space-y-4 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={ShieldCheck}
                title="No audit entries"
                description="No administrator operational actions have been recorded yet."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5">Actor</th>
                    <th className="px-5 py-3.5">Action Code</th>
                    <th className="px-5 py-3.5">Entity Target</th>
                    <th className="px-5 py-3.5">IP Address</th>
                    <th className="px-5 py-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      {/* Actor */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{log.user?.name || 'System'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {log.user?.role || 'SYSTEM'}
                        </div>
                      </td>

                      {/* Action Code */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {log.action}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{log.entityType}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-[150px]">
                          {log.entityId}
                        </div>
                      </td>

                      {/* IP */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-500">
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      {/* Details View */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetails(log)}
                          className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit Pagination */}
          {auditPagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <div>
                Showing page{' '}
                <strong className="font-bold text-slate-900">{auditPagination.page}</strong> of{' '}
                <strong className="font-bold text-slate-900">{auditPagination.totalPages}</strong> (
                {auditPagination.total} logs)
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(auditPagination.page - 1)}
                  disabled={auditPagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(auditPagination.page + 1)}
                  disabled={auditPagination.page >= auditPagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ======================================================================
          TAB 2: AUTHENTICATION & LOGIN LOGS
         ====================================================================== */}
      {activeTab === 'login' && (
        <Card className="overflow-hidden shadow-xs">
          {isLoadingLogin ? (
            <div className="p-6 space-y-4 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : loginLogs.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Key}
                title="No login events"
                description="No customer or admin authentication events recorded."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5">Attempted Email</th>
                    <th className="px-5 py-3.5">Result</th>
                    <th className="px-5 py-3.5">IP Address</th>
                    <th className="px-5 py-3.5">User Agent</th>
                    <th className="px-5 py-3.5">Failure Diagnostic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loginLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {log.email}
                      </td>

                      {/* Result */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Badge
                          variant={log.success ? 'success' : 'danger'}
                          size="sm"
                          icon={
                            log.success ? (
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-rose-600" />
                            )
                          }
                        >
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                      </td>

                      {/* IP */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-500">
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      {/* User Agent */}
                      <td
                        className="px-5 py-3.5 max-w-xs truncate text-slate-500 text-[11px]"
                        title={log.userAgent}
                      >
                        {log.userAgent || 'Unknown client'}
                      </td>

                      {/* Diagnostic */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                        {log.failureReason ? (
                          <span className="text-rose-600 font-semibold text-[11px]">
                            {log.failureReason}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Login Pagination */}
          {loginPagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <div>
                Showing page{' '}
                <strong className="font-bold text-slate-900">{loginPagination.page}</strong> of{' '}
                <strong className="font-bold text-slate-900">{loginPagination.totalPages}</strong> (
                {loginPagination.total} logins)
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(loginPagination.page - 1)}
                  disabled={loginPagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(loginPagination.page + 1)}
                  disabled={loginPagination.page >= loginPagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ======================================================================
          JSON DETAILS MODAL FOR AUDIT LOG
         ====================================================================== */}
      <Modal
        isOpen={!!selectedLogDetails}
        onClose={() => setSelectedLogDetails(null)}
        title="Audit Event Details"
        description={selectedLogDetails ? `Action: ${selectedLogDetails.action}` : ''}
        maxWidth="max-w-lg"
      >
        {selectedLogDetails && (
          <div className="space-y-4 p-6 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Actor Information
              </span>
              <div className="font-bold text-slate-900">
                {selectedLogDetails.user?.name} ({selectedLogDetails.user?.email})
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Payload Snapshot
              </span>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60">
                {JSON.stringify(selectedLogDetails.details || {}, null, 2)}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedLogDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminAuditLogsPage;
