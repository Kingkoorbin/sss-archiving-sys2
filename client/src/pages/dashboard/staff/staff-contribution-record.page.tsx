import StaffNavbar from '../../../components/nav-staff.component';
import {
  CloseOutlined,
  DownloadOutlined,
  EditOutlined,
  FileOutlined,
  FilterOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Modal,
  Popconfirm,
  Row,
  Table,
  Tooltip,
  Upload,
  message,
} from 'antd';
import { API, API_BASE_URL } from '../../../const/api.const';
import { contributionColumns } from '../../../const/table-columns.const';
import {
  IContribution,
  IGeneratePdfPayload,
  ISBRPayload,
  IUser,
} from '../../../interfaces/client.interface';
import { useEffect, useState } from 'react';
import useLocalStorage from '../../../hooks/useLocalstorage.hook';
import { IApiResponse } from '../../../interfaces/api.interface';
import SearchSSSNoFormFields from '../../../components/form-search-sssno-component';
import { SubmitHandler, useForm } from 'react-hook-form';
import DateRangeeFormFields from '../../../components/form-daterange.component';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import SbrFormFields from '../../../components/form-sbr.component';
import { hasPermission, isEmpty } from '../../../utils/util';
import { TPermissionTypes } from '../../../interfaces/permission.interface';
import dayjs from 'dayjs';
import ContributionFormFields from '../../../components/form-sbr.component';
import moment from 'moment';
import { currency } from '../../../utils/converter.util';

const { Dragger } = Upload;

interface IState {
  generatedTotal: string;
  generatedCount: string;
  user?: IUser;
  isAuthModalOpen: boolean;
  isFetchingContributions: boolean;
  isSBRModalOpen: boolean;
  isConfirmOverwriteModalOpen: boolean;
  contributions: IContribution[];
  selectedContributionId: number | null;
  batchDate: string;
  generatePdfQuery?: any;
  isModalSingleContributionOpen: boolean;
  triggerOverwrite: boolean;
}

export default function StaffContributionRecord() {
  const { value: getAuthResponse } = useLocalStorage<IApiResponse | null>(
    'auth_response',
    null
  );
  const [state, setState] = useState<IState>({
    generatedTotal: '0.00',
    generatedCount: '0.00',
    user: undefined,
    isAuthModalOpen: false,
    isFetchingContributions: false,
    isSBRModalOpen: false,
    isConfirmOverwriteModalOpen: false,
    triggerOverwrite: false,
    contributions: [],
    selectedContributionId: null,
    batchDate: '',
    isModalSingleContributionOpen: false,
    generatePdfQuery: {},
  });

  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    handleSubmit: handleSubmitGenerateFormData,
    control: generateController,
    setValue: setSearchValue,
  } = useForm<IGeneratePdfPayload>();

  const {
    handleSubmit: handleSubmitSBRFormData,
    control: sbrController,
    setValue: cntributionSetValue,
    reset: sbrFormReset,
    formState: { isSubmitting: isCreatingSBR, errors: contributionEditErrors },
  } = useForm<ISBRPayload>();

  const {
    handleSubmit: singleContributionSubmit,
    control: singleContributionController,
    reset: singleContributionReset,
    setValue: singleContributionSetValue,
    formState: {
      isSubmitting: singleContributionIsSubmitting,
      errors: singleContributionErrors,
    },
  } = useForm<IContribution>();

  const onGetUserProfile = async () => {
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${getAuthResponse?.access_token}`,
      },
    };
    const getProfileResponse: AxiosResponse = await axios.get(
      `${API_BASE_URL}/api/user/v1`,
      {
        ...config,
      }
    );

    setState((prev) => ({
      ...prev,
      user: getProfileResponse.data,
    }));
  };

  const getContributions = async (data?: IGeneratePdfPayload) => {
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${getAuthResponse?.access_token}`,
      },
    };

    try {
      setState((prev) => ({
        ...prev,
        isFetchingContributions: true,
      }));

      const getAllContributionsResponse: AxiosResponse & {
        data: IContribution[];
      } = await axios.get(`${API_BASE_URL}/api/record/v1`, {
        params: data,
        ...config,
      });

      const getProfileResponse: AxiosResponse = await axios.get(
        `${API_BASE_URL}/api/user/v1`,
        {
          ...config,
        }
      );

      const user: IUser = getProfileResponse.data;

      if (!user.user_permissions.length) {
        setState((prev) => ({
          ...prev,
          isFetchingContributions: false,
        }));
      }

      if (!Array.isArray(getAllContributionsResponse.data)) {
        return;
      }

      setState((prev) => ({
        ...prev,
        generatedCount:
          getAllContributionsResponse.headers['nodex-generated-count'],
        generatedTotal: currency.format(
          getAllContributionsResponse.headers['nodex-generated-total']
        ),
        isFetchingContributions: false,
        contributions: getAllContributionsResponse.data?.map(
          (el: IContribution) => ({
            ...el,
            key: el.id,
            batchDate: dayjs(el.batchDate).format('MMM YYYY'),
            ec: '₱' + el.ec,
            ss: '₱' + el.ss,
            total: '₱' + el.total,
            actions: (
              <Flex gap={10}>
                <Tooltip
                  title={
                    hasPermission(user.user_permissions, TPermissionTypes.EDIT)
                      ? 'Edit'
                      : 'No Permission'
                  }
                >
                  <Button
                    type="dashed"
                    icon={<EditOutlined />}
                    disabled={
                      !hasPermission(
                        user.user_permissions,
                        TPermissionTypes.EDIT
                      )
                    }
                    onClick={() => {
                      singleContributionReset();
                      if (el?.sbr_no) {
                        cntributionSetValue('sbr_no', el.sbr_no);
                      }
                      if (el?.sbr_date) {
                        cntributionSetValue(
                          'sbr_date',
                          moment(el.sbr_date, 'YYYY-MM-DD') as any
                        );
                      }
                      if (el?.ec) {
                        cntributionSetValue(
                          'ec',
                          el.ec.startsWith('₱') ? el.ec.substring(1) : el.ec
                        );
                      }
                      if (el?.ss) {
                        cntributionSetValue(
                          'ss',
                          el.ss.startsWith('₱') ? el.ss.substring(1) : el.ss
                        );
                      }
                      if (el?.total) {
                        cntributionSetValue(
                          'total',
                          el.total.startsWith('₱')
                            ? el.total.substring(1)
                            : el.total
                        );
                      }
                      if (el?.name) {
                        cntributionSetValue('name', el.name);
                      }
                      if (el?.sbr_no) {
                        cntributionSetValue('sbr_no', el.sbr_no);
                      }
                      if (el?.sss_no) {
                        cntributionSetValue('sss_no', el.sss_no);
                      }
                      setState((prev) => ({
                        ...prev,
                        selectedContributionId: el.id,
                        isSBRModalOpen: !prev.isSBRModalOpen,
                      }));
                    }}
                  >
                    Edit
                  </Button>
                </Tooltip>
                <Tooltip
                  title={
                    hasPermission(
                      user.user_permissions,
                      TPermissionTypes.DELETE
                    )
                      ? 'Delete'
                      : 'No Permission'
                  }
                >
                  <Button
                    style={{ color: 'red' }}
                    icon={<CloseOutlined />}
                    disabled={
                      !hasPermission(
                        user.user_permissions,
                        TPermissionTypes.DELETE
                      )
                    }
                    onClick={() => onDeleteContribution(el.id)}
                  >
                    Delete
                  </Button>
                </Tooltip>
              </Flex>
            ),
          })
        ) as any,
      }));

      // If there is a state coming from redirection
      if (!isEmpty(location.state)) {
        setSearchValue('searchKeyword', location.state?.request?.sss_no ?? '');
      }
    } catch (error: any) {
      if (error?.response?.status == 401) {
        setState((prev) => ({
          ...prev,
          isAuthModalOpen: true,
          isFetchingContributions: false,
        }));
      }
    }
  };

  const handleUpdateSbr: SubmitHandler<ISBRPayload> = async (data) => {
    const date = new Date(data.sbr_date);
    data.sbr_date = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .substring(0, 10);

    const response = await axios.put(
      `${API_BASE_URL}/api/record/v1/${state.selectedContributionId}/sbr`,
      data,
      {
        headers: {
          Authorization: `Bearer ${getAuthResponse?.access_token}`,
        },
      }
    );

    if (response?.data.message === 'Authentication required.') {
      setState((prev) => ({
        ...prev,
        isAuthModalOpen: true,
      }));

      return;
    }

    sbrFormReset();

    await getContributions();

    toastSuccess('Updated successfully!');

    setState((prev) => ({
      ...prev,
      isSBRModalOpen: false,
    }));
  };

  const handleApplyFilter: SubmitHandler<
    IGeneratePdfPayload & { searchKeyword?: string; duration?: any }
  > = async (data) => {
    const isInvalidSearchkey =
      /[0-9]/.test(data.searchKeyword!) && /[a-zA-Z]/.test(data.searchKeyword!);

    if (isInvalidSearchkey) {
      return toastError('Search keyword must be a Name or SSS Number');
    }

    let startDate: any = null;
    let endDate: any = null;
    if (data.duration?.length == 2) {
      startDate = new Date(data.duration[0]).toISOString().substring(0, 10);
      endDate = new Date(data.duration[1]).toISOString().substring(0, 10);
    }

    // Check if the searchKeyword contains a number
    const regex = /.*\d.*/;
    if (regex.test(data.searchKeyword!)) {
      // If it contains a number, search by schoolId
      await getContributions({
        sssNo: data.searchKeyword,
        ...(startDate ? { from: startDate } : {}),
        ...(endDate ? { to: endDate } : {}),
      });

      setState((prev) => ({
        ...prev,
        generatePdfQuery: {
          sssNo: data.searchKeyword,
          from: startDate,
          to: endDate,
        },
      }));
    } else {
      // If it doesn't contain a number, search by department
      await getContributions({
        name: data.searchKeyword,
        ...(startDate ? { from: startDate } : {}),
        ...(endDate ? { to: endDate } : {}),
      });
      setState((prev) => ({
        ...prev,
        generatePdfQuery: {
          name: data.searchKeyword,
          from: startDate,
          to: endDate,
        },
      }));
    }
  };

  const handleGeneratePdf = async () => {
    try {
      if (state.contributions.length >= 100) {
        return toastError(
          'Oops! Sorry, We cannot Generate PDF with more than 100 rows'
        );
      }
      const response = await axios.get(API.generateContributionPdf, {
        params: {
          ...(state?.generatePdfQuery.name
            ? { name: state?.generatePdfQuery.name }
            : {}),
          ...(state?.generatePdfQuery.sssNo
            ? { sssNo: state?.generatePdfQuery.sssNo }
            : {}),
          ...(state?.generatePdfQuery.sssNo
            ? { displaySSSNo: state?.generatePdfQuery.sssNo }
            : {}),
          ...(state?.generatePdfQuery.name
            ? { displayName: state?.generatePdfQuery.name }
            : {}),
          ...(state?.generatePdfQuery.from && state?.generatePdfQuery.to
            ? {
                from: state?.generatePdfQuery.from,
                to: state?.generatePdfQuery.to,
              }
            : {}),
          ...(state?.generatePdfQuery.from && state?.generatePdfQuery.to
            ? {
                displayCoverage: `${dayjs(state?.generatePdfQuery.from).format(
                  'MMMM YYYY'
                )} up to ${dayjs(state?.generatePdfQuery.to).format(
                  'MMMM YYYY'
                )}`,
              }
            : {}),
        },
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/pdf',
        },
        responseType: 'blob',
      });

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);

      // Open the PDF in a new tab
      window.open(url, '_blank');
    } catch (error) {
      console.log('error', error);
    }
  };

  const props: UploadProps = {
    name: 'csv',
    multiple: false,
    async customRequest({ file, onSuccess, onError }) {
      if (typeof file === 'string') {
        return;
      }

      const formData = new FormData();
      formData.append('csv', file);
      formData.append('batchDate', state.batchDate);

      try {
        if (state.triggerOverwrite) {
          await handleSilentDeleteContributionsByBatch();
        }
        axios
          .post(API.uploadCsv, formData)
          .then((response) => {
            // Handle success
            onSuccess?.(response, file as any);
          })
          .catch((error) => {
            // Handle error
            onError?.(error, file);
          });
      } catch (error) {
        console.log(error);
      }
    },
    onChange(info) {
      const { status } = info.file;
      if (status !== 'uploading') {
      }
      if (status === 'done') {
        getContributions();
      } else if (status === 'error') {
      }
    },
    accept: '.csv',
    showUploadList: true,
    onDrop(e) {},
  };

  const handleRequireLogin = () => {
    setState((prev) => ({
      ...prev,
      isAuthModalOpen: false,
    }));

    navigate('/', { replace: true });
  };

  const onDeleteContribution = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/record/v1/${id}`, {
        headers: {
          Authorization: `Bearer ${getAuthResponse?.access_token}`,
        },
      });

      toastSuccess('Removed successfully!');
      await getContributions();
    } catch (error) {
      toastError('Oops! Something went wrong, Please try again.');
    }
  };

  const handleChangeBatchDate = async (v: any) => {
    if (!isEmpty(v)) {
      const batchDate = new Date(v).toISOString().substring(0, 10);
      await handleValidateBatchDate(batchDate);
      setState((prev) => ({
        ...prev,
        batchDate,
      }));
    }
  };

  const handleValidateBatchDate = async (batchDate: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/record/v1/validate`,
        {
          params: { batchDate },
          headers: { Authorization: `Bearer ${getAuthResponse?.access_token}` },
        }
      );
      setState((prev) => ({
        ...prev,
        isConfirmOverwriteModalOpen: response.data?.exists,
      }));
    } catch (error) {
      toastError('Oops! Something went wrong, Please try again.');
    }
  };

  const handleSaveSingleContribution: SubmitHandler<IContribution> = async (
    data
  ) => {
    try {
      await axios.post(`${API_BASE_URL}/api/record/v1/s`, data, {
        headers: {
          Authorization: `Bearer ${getAuthResponse?.access_token}`,
        },
      });

      singleContributionReset();

      await getContributions();

      toastSuccess('Saved successfully!');
      await getContributions();
    } catch (error) {
      toastError('Oops! Something went wrong, Please try again.');
    }
  };

  const rowProps = (record: IContribution) => ({
    onDoubleClick: () => {
      if (hasPermission(state.user?.user_permissions!, TPermissionTypes.EDIT)) {
        singleContributionReset();
        if (record?.sbr_no) {
          cntributionSetValue('sbr_no', record.sbr_no);
        }
        if (record?.sbr_date) {
          cntributionSetValue(
            'sbr_date',
            moment(record.sbr_date, 'YYYY-MM-DD') as any
          );
        }
        if (record?.ec) {
          cntributionSetValue('ec', record.ec.substring(1, record.ec.length));
        }
        if (record?.ss) {
          cntributionSetValue('ss', record.ss.substring(1, record.ss.length));
        }
        if (record?.total) {
          cntributionSetValue(
            'total',
            record.total.substring(1, record.total.length)
          );
        }
        if (record?.name) {
          cntributionSetValue('name', record.name);
        }
        if (record?.sbr_no) {
          cntributionSetValue('sbr_no', record.sbr_no);
        }
        if (record?.sss_no) {
          cntributionSetValue('sss_no', record.sss_no);
        }
        setState((prev: any) => ({
          ...prev,
          selectedContributionId: record.id,
          isSBRModalOpen: !prev.isSBRModalOpen,
        }));

        return;
      }

      alert('No Edit Permission');
    },
  });

  const handleSilentDeleteContributionsByBatch = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/record/v1/batch/delete`, {
        data: {
          date: `${state.batchDate.substring(0, 7)}-01`,
        },
        headers: {
          Authorization: `Bearer ${getAuthResponse?.access_token}`,
        },
      });
    } catch (error) {
      toastError('Oops! Something went wrong, Please try again.');
    }
  };

  useEffect(() => {
    getContributions();
    onGetUserProfile();
  }, []);

  return (
    <>
      {contextHolder}
      <StaffNavbar />
      <Modal
        title="Confirmation"
        open={state.isConfirmOverwriteModalOpen}
        onOk={async () => {
          setState((prev) => ({
            ...prev,
            triggerOverwrite: true,
            isConfirmOverwriteModalOpen: !prev.isConfirmOverwriteModalOpen,
          }));
        }}
        confirmLoading={false}
        onCancel={() =>
          setState((prev) => ({
            ...prev,
            isConfirmOverwriteModalOpen: !prev.isConfirmOverwriteModalOpen,
            triggerOverwrite: false,
          }))
        }
      >
        <p>
          The batch date has already been recorded. Selecting 'OK' will result
          in the replacement of the existing data. Are you sure you wish to
          proceed with the overwrite?
        </p>
      </Modal>
      <div style={{ padding: 50 }}>
        <Tooltip
          title={
            hasPermission(
              state.user?.user_permissions!,
              TPermissionTypes.GENERATE
            )
              ? 'Generate'
              : 'No Permission'
          }
        >
          <div style={{ padding: 50 }}>
            <div style={{ position: 'relative' }}>
              <Flex>
                <div style={{ width: '60%' }}>
                  <Dragger disabled={isEmpty(state.batchDate)} {...props}>
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Click or drag the CSV file to this area to upload
                    </p>
                    <p className="ant-upload-hint">
                      Strictly prohibited from uploading company data or other
                      banned files.
                    </p>
                  </Dragger>
                </div>
                <Row
                  gutter={16}
                  style={{ width: 'full', marginLeft: 20 }}
                  justify={'space-between'}
                >
                  <Col span={14}>
                    <Card
                      title="Transaction total"
                      bordered={false}
                      style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        height: '100%',
                      }}
                    >
                      {state.generatedTotal}
                    </Card>
                  </Col>
                  <Col span={10}>
                    <Card
                      title="Transaction count"
                      bordered={false}
                      style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        height: '100%',
                      }}
                    >
                      {state.generatedCount}
                    </Card>
                  </Col>
                </Row>
              </Flex>
              <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
                <DatePicker
                  onChange={(v) => handleChangeBatchDate(v)}
                  disabled={
                    !hasPermission(
                      state.user?.user_permissions!,
                      TPermissionTypes.UPLOAD
                    )
                  }
                  picker="month"
                  size="large"
                />
              </div>
            </div>
          </div>
        </Tooltip>

        <div style={{ marginTop: 20 }}>
          <form onSubmit={handleSubmitGenerateFormData(handleApplyFilter)}>
            <Flex gap={5}>
              <Tooltip title="Add a single contribution">
                <Button
                  type="default"
                  shape="circle"
                  icon={<FileOutlined />}
                  disabled={
                    !hasPermission(
                      state.user?.user_permissions!,
                      TPermissionTypes.UPLOAD
                    )
                  }
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      isModalSingleContributionOpen:
                        !prev.isModalSingleContributionOpen,
                    }))
                  }
                />
              </Tooltip>
              <Flex gap={10} flex={1}>
                <SearchSSSNoFormFields
                  control={generateController}
                  isSearching={false}
                />
              </Flex>
              <div>
                <DateRangeeFormFields control={generateController} />
              </div>
              <Button type="dashed" icon={<FilterOutlined />} htmlType="submit">
                Search
              </Button>
              <div style={{ marginLeft: 20 }}>
                <Popconfirm
                  title={
                    hasPermission(
                      state.user?.user_permissions!,
                      TPermissionTypes.GENERATE
                    )
                      ? 'Do you want to print PDF?'
                      : 'No Permission'
                  }
                  onConfirm={() => handleGeneratePdf()}
                  okText="Yes"
                  cancelText="No"
                  placement="bottomLeft"
                >
                  <Tooltip title="Print">
                    <Button
                      type="primary"
                      htmlType="button"
                      icon={<DownloadOutlined />}
                      disabled={
                        state.contributions.length >= 100 ||
                        !hasPermission(
                          state.user?.user_permissions!,
                          TPermissionTypes.GENERATE
                        )
                      }
                    >
                      Generate
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </div>
            </Flex>
          </form>

          <Modal
            title="Save Contribution"
            open={state.isModalSingleContributionOpen}
            cancelButtonProps={{
              style: { display: 'none' },
            }}
            okButtonProps={{
              style: { display: 'none' },
            }}
            width={700}
            onCancel={() =>
              setState((prev) => ({
                ...prev,
                isModalSingleContributionOpen:
                  !prev.isModalSingleContributionOpen,
              }))
            }
          >
            <form
              onSubmit={singleContributionSubmit(handleSaveSingleContribution)}
            >
              <ContributionFormFields
                control={singleContributionController}
                errors={singleContributionErrors}
                includeBatchDate
              />
              <Button
                type="primary"
                size="middle"
                loading={singleContributionIsSubmitting}
                htmlType="submit"
                style={{ marginTop: 10 }}
                block
              >
                Submit
              </Button>
            </form>
          </Modal>

          <Modal
            title="Edit SBR"
            open={state.isSBRModalOpen}
            cancelButtonProps={{
              style: { display: 'none' },
            }}
            okButtonProps={{
              style: { display: 'none' },
            }}
            width={700}
            onCancel={() =>
              setState((prev) => ({
                ...prev,
                isSBRModalOpen: !prev.isSBRModalOpen,
              }))
            }
          >
            <form onSubmit={handleSubmitSBRFormData(handleUpdateSbr)}>
              <SbrFormFields
                control={sbrController}
                errors={contributionEditErrors}
              />
              <Button
                type="primary"
                size="middle"
                loading={isCreatingSBR}
                htmlType="submit"
                style={{ marginTop: 20 }}
                block
              >
                Submit
              </Button>
            </form>
          </Modal>

          <Table
            columns={contributionColumns as any}
            dataSource={state.contributions as any}
            loading={state.isFetchingContributions}
            onRow={rowProps}
            size="middle"
          />

          <Modal
            title="Oops!"
            closable={false}
            open={state.isAuthModalOpen}
            width={400}
            cancelButtonProps={{
              style: { display: 'none' },
            }}
            onOk={() => handleRequireLogin()}
          >
            <p>
              Authentication session has expired. Kindly proceed to log in again
              for continued access.
            </p>
          </Modal>
        </div>
      </div>
    </>
  );

  function toastSuccess(message: string) {
    messageApi.success({
      type: 'success',
      content: message,
      style: {
        marginTop: '90vh',
      },
    });
  }

  function toastError(message: string) {
    messageApi.error({
      type: 'error',
      content: message,
      style: {
        marginTop: '90vh',
      },
    });
  }
}
