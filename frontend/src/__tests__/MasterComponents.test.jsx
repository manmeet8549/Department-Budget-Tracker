import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Field from '../components/Field.jsx';
import DataTable from '../components/DataTable.jsx';

describe('Shared UI Components (design.md)', () => {
  describe('Button Component', () => {
    it('renders with children and handles onClick', () => {
      let clicked = false;
      render(
        <Button onClick={() => { clicked = true; }}>
          Click Me
        </Button>
      );
      const btn = screen.getByRole('button', { name: /Click Me/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(clicked).toBe(true);
    });

    it('renders loading spinner and disables when loading', () => {
      render(<Button loading>Submit</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
    });
  });

  describe('Card Component', () => {
    it('renders title, subtitle, actions and children', () => {
      render(
        <Card
          title="Test Title"
          subtitle="Test Subtitle"
          actions={<button>Action</button>}
        >
          <div>Card Body</div>
        </Card>
      );
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
      expect(screen.getByText('Card Body')).toBeInTheDocument();
    });
  });

  describe('Field Component', () => {
    it('renders label and input with error message', () => {
      render(
        <Field
          id="test-field"
          label="Test Label"
          placeholder="Enter text"
          error="This field is required"
        />
      );
      expect(screen.getByLabelText(/Test Label/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });
  });

  describe('DataTable Component', () => {
    it('renders columns and data rows', () => {
      const columns = [
        { header: 'Code', accessor: 'code' },
        { header: 'Name', accessor: 'name' },
      ];
      const data = [
        { id: 1, code: 'ET', name: 'Engineering Block' },
        { id: 2, code: 'MT', name: 'Management Block' },
      ];

      render(<DataTable columns={columns} data={data} />);
      expect(screen.getByText('ET')).toBeInTheDocument();
      expect(screen.getByText('Engineering Block')).toBeInTheDocument();
      expect(screen.getByText('MT')).toBeInTheDocument();
    });

    it('shows emptyMessage when data is empty', () => {
      render(<DataTable columns={[{ header: 'Code', accessor: 'code' }]} data={[]} emptyMessage="No rows found" />);
      expect(screen.getByText('No rows found')).toBeInTheDocument();
    });
  });
});
